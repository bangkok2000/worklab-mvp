import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import pdf from 'pdf-parse';
import { createServerClient } from '@/lib/supabase/client';
import { createDocument, updateDocumentStatus } from '@/lib/supabase/documents';
import { estimateOpenAICost, logUsage } from '@/lib/supabase/usage';
import { getBalance, deductCredits, getCreditCost } from '@/lib/supabase/credits';
import { getTeamApiKey } from '@/lib/supabase/teams';

// Server-side AI: Use Team API Key OR personal BYOK OR Credits

let _pinecone: Pinecone | null = null;
const getPinecone = () => {
  if (!_pinecone) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('Missing PINECONE_API_KEY environment variable');
    }
    _pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return _pinecone;
};

const getIndex = () => {
  if (!process.env.PINECONE_INDEX) {
    throw new Error('Missing PINECONE_INDEX environment variable');
  }
  return getPinecone().index(process.env.PINECONE_INDEX);
};

// Configure route for large file uploads (up to 100MB)
export const maxDuration = 300; // 5 minutes for large file processing
export const runtime = 'nodejs'; // Use Node.js runtime for file processing

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const collectionId = formData.get('collectionId') as string | null;
    const apiKey = formData.get('apiKey') as string | null; // BYOK: User's OpenAI key
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get user from Supabase
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    let authenticatedSupabase = supabase; // Default to unauthenticated client

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      userId = user?.id || null;
      
      // Create authenticated client for RLS policies
      if (user && !authError) {
        // Create a new client with the user's access token for RLS
        const { createClient } = await import('@supabase/supabase-js');
        authenticatedSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          }
        );
      }
    }

    // Convert file to buffer and extract PDF info first (to estimate pages)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Try to parse the PDF - handle protected/encrypted PDFs
    let data;
    let text: string;
    let pageCount: number;
    let isOcrRequired = false;
    let ocrWarning: string | null = null;
    
    try {
      data = await pdf(buffer);
      text = data.text;
      pageCount = data.numpages || 1;
      
      // Check if PDF is likely scanned/image-based (very little text extracted)
      const avgCharsPerPage = text.length / pageCount;
      const minExpectedCharsPerPage = 100; // A real text PDF should have at least 100 chars/page
      
      if (avgCharsPerPage < minExpectedCharsPerPage && pageCount > 0) {
        isOcrRequired = true;
        ocrWarning = `This PDF appears to be scanned or image-based (only ${Math.round(avgCharsPerPage)} characters per page detected). Text extraction may be incomplete. For better results, consider using OCR software to convert the PDF first.`;
        console.log(`[Upload] Low text density detected: ${avgCharsPerPage} chars/page - likely scanned PDF`);
      }
      
      // If text is completely empty, provide a clear message
      if (!text || text.trim().length === 0) {
        return NextResponse.json({ 
          error: 'This PDF contains no extractable text. It may be a scanned document or contain only images. Please use OCR software (like Adobe Acrobat or online tools) to convert it to searchable text first.',
          isScannedPdf: true,
          pageCount,
        }, { status: 400 });
      }
      
    } catch (pdfError: any) {
      console.error('[Upload] PDF parsing error:', pdfError);
      
      // Check for password-protected PDF
      if (pdfError.message?.includes('password') || 
          pdfError.message?.includes('encrypted') ||
          pdfError.message?.includes('Password')) {
        return NextResponse.json({ 
          error: 'This PDF is password-protected. Please remove the password protection or provide an unprotected version.',
          isPasswordProtected: true,
        }, { status: 400 });
      }
      
      // Check for DRM/copy protection
      if (pdfError.message?.includes('permission') || 
          pdfError.message?.includes('restricted') ||
          pdfError.message?.includes('copy')) {
        return NextResponse.json({ 
          error: 'This PDF has copy restrictions that prevent text extraction. Please use a version without DRM protection.',
          isDrmProtected: true,
        }, { status: 400 });
      }
      
      // Check for corrupted PDF
      if (pdfError.message?.includes('Invalid') || 
          pdfError.message?.includes('corrupt') ||
          pdfError.message?.includes('malformed')) {
        return NextResponse.json({ 
          error: 'This PDF file appears to be corrupted or invalid. Please try re-downloading or recreating the file.',
          isCorrupted: true,
        }, { status: 400 });
      }
      
      // Generic PDF error
      return NextResponse.json({ 
        error: `Failed to process PDF: ${pdfError.message}. Please ensure the file is a valid PDF document.`,
      }, { status: 400 });
    }
    
    // Credit cost is per page
    const creditCostPerPage = await getCreditCost('upload_document_page');
    const totalCreditCost = creditCostPerPage * pageCount;
    
    // Determine API key source (priority: user BYOK > team key > server credits)
    let openaiKey: string | null = null;
    let keySource: 'byok' | 'team' | 'credits' = 'credits';
    let teamName: string | null = null;
    const serverOpenAIKey = process.env.OPENAI_API_KEY;
    
    // 1. Check for user-provided BYOK key (highest priority)
    if (apiKey) {
      openaiKey = apiKey;
      keySource = 'byok';
      console.log('[Upload] Using BYOK (user-provided) key');
    }
    // 2. Check for team API key
    else if (userId) {
      const teamResult = await getTeamApiKey(userId);
      if (teamResult.hasKey && teamResult.apiKey) {
        openaiKey = teamResult.apiKey;
        keySource = 'team';
        teamName = teamResult.teamName;
        console.log(`[Upload] Using Team API key from "${teamName}"`);
      }
    }
    
    // 3. If no BYOK or team key, use credits mode
    if (!openaiKey) {
      if (!serverOpenAIKey) {
        return NextResponse.json({ 
          error: 'Server AI not configured. Please use BYOK mode (add your API key in Settings) or join a team.' 
        }, { status: 503 });
      }
      
      if (!userId) {
        return NextResponse.json({ 
          error: 'Please sign in to use credits, add your own API key, or join a team.' 
        }, { status: 401 });
      }
      
      // Check if user has enough credits (use authenticated client for RLS)
      const balance = await getBalance(userId, authenticatedSupabase);
      if (balance < totalCreditCost) {
        return NextResponse.json({ 
          error: `Insufficient credits. This ${pageCount}-page document needs ${totalCreditCost} credits but you have ${balance}. Buy more credits, use your own API key, or join a team.`,
          creditsNeeded: totalCreditCost,
          currentBalance: balance,
          pageCount,
        }, { status: 402 }); // 402 = Payment Required
      }
      
      openaiKey = serverOpenAIKey;
      keySource = 'credits';
      console.log(`[Upload] Credits mode: User ${userId} has ${balance} credits, upload costs ${totalCreditCost} (${pageCount} pages)`);
    }
    
    if (!openaiKey) {
      return NextResponse.json({ 
        error: 'No API key available. Please add your OpenAI API key in Settings, join a team, or sign in to use credits.' 
      }, { status: 401 });
    }
    
    const isUsingBYOK = keySource !== 'credits';
    const openai = new OpenAI({ apiKey: openaiKey });

    // Create document record in Supabase (if user is authenticated)
    let documentId: string | null = null;
    if (userId) {
      try {
        const document = await createDocument({
          user_id: userId,
          collection_id: collectionId || null,
          filename: file.name,
          original_filename: file.name,
          file_size: file.size,
          file_type: file.type || 'application/pdf',
          chunk_count: 0,
          status: 'processing',
          metadata: {
            page_count: pageCount,
            word_count: text.split(/\s+/).length,
            extracted_at: new Date().toISOString(),
          },
        });
        documentId = document.id;
      } catch (dbError) {
        console.warn('Failed to create document record:', dbError);
        // Continue processing even if DB fails
      }
    }

    // Chunk text into ~1500 token pieces (larger chunks for better context)
    // This will create fewer but more comprehensive chunks
    const chunks = chunkText(text, 1500);
    
    // Generate embeddings for all chunks
    let totalEmbeddingTokens = 0;
    const embeddings = await Promise.all(
      chunks.map(async (chunk, idx) => {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: chunk,
        });
        
        totalEmbeddingTokens += response.usage.total_tokens;
        
        // Build metadata object - only include document_id if it exists
        const metadata: Record<string, any> = {
          text: chunk,
          source: file.name,
          chunk_index: idx,
        };
        
        // Only add document_id if user is authenticated and document was created
        if (documentId) {
          metadata.document_id = documentId;
        }
        
        return {
          id: `${file.name}-chunk-${idx}`,
          values: response.data[0].embedding,
          metadata,
        };
      })
    );

    // Store in Pinecone
    await getIndex().upsert(embeddings);

    // Update document status in Supabase
    if (documentId && userId) {
      try {
        await updateDocumentStatus(documentId, 'ready', chunks.length);
        
        // Log usage
        const embeddingCost = estimateOpenAICost('embedding', totalEmbeddingTokens);
        await logUsage({
          user_id: userId,
          api_key_id: null, // TODO: Link to API key when BYOK is implemented
          provider: 'openai',
          model: 'text-embedding-3-large',
          operation: 'embedding',
          tokens_used: totalEmbeddingTokens,
          cost_estimate: embeddingCost,
        });
      } catch (dbError) {
        console.warn('Failed to update document status:', dbError);
      }
    }

    // Deduct credits if using credits mode (not BYOK)
    let remainingBalance: number | null = null;
    if (!isUsingBYOK && userId && totalCreditCost > 0) {
      try {
        const deductResult = await deductCredits(userId, 'upload_document_page', {
          description: `Uploaded: ${file.name} (${pageCount} pages)`,
          referenceId: documentId || undefined,
          referenceType: 'document',
          metadata: { filename: file.name, pageCount, chunks: chunks.length },
        }, authenticatedSupabase);
        
        if (deductResult.success) {
          remainingBalance = deductResult.balance;
          console.log(`[Upload] Deducted ${totalCreditCost} credits from user ${userId}, remaining: ${remainingBalance}`);
        } else {
          console.error('[Upload] Failed to deduct credits:', deductResult.error);
        }
      } catch (deductError) {
        console.error('[Upload] Error deducting credits:', deductError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      chunks: chunks.length,
      filename: file.name,
      documentId,
      pageCount,
      // OCR warning if text extraction was limited
      warning: ocrWarning || undefined,
      isOcrRequired: isOcrRequired || undefined,
      // Credit usage info (only for credits mode)
      credits: keySource === 'credits' ? {
        used: totalCreditCost,
        remaining: remainingBalance,
      } : undefined,
      mode: keySource,
      teamName: keySource === 'team' ? teamName : undefined,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function chunkText(text: string, maxTokens: number): string[] {
  // Improved chunking: split by sentences, then by paragraphs
  // This creates more semantic chunks that respect document structure
  const chunkSize = maxTokens * 4; // Character limit per chunk
  const chunks: string[] = [];
  
  // First, split by paragraphs (double newlines)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size, save current chunk
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    
    // Add paragraph to current chunk
    if (currentChunk.length > 0) {
      currentChunk += '\n\n' + paragraph;
    } else {
      currentChunk = paragraph;
    }
    
    // If a single paragraph is too large, split it by sentences
    if (currentChunk.length > chunkSize) {
      const sentences = currentChunk.split(/(?<=[.!?])\s+/);
      currentChunk = '';
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
        }
      }
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  // Ensure we have at least some chunks
  if (chunks.length === 0 && text.length > 0) {
    // Fallback: split by character if no paragraphs found
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize).trim());
    }
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}