import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import pdf from 'pdf-parse';
import { createServerClient } from '@/lib/supabase/client';
import { createDocument, updateDocumentStatus } from '@/lib/supabase/documents';
import { estimateOpenAICost, logUsage } from '@/lib/supabase/usage';
import { getBalance, deductCredits, getCreditCost } from '@/lib/supabase/credits';
import { getTeamApiKey } from '@/lib/supabase/teams';

// Reuse Pinecone client from upload route
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

// Initialize S3 client (works with Cloudflare R2 - S3-compatible)
let s3Client: S3Client | null = null;

const getS3Client = () => {
  if (!s3Client) {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 storage not configured');
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

// Configure route for large file processing
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { fileId, key, projectId, apiKey } = await req.json();
    
    // Validate required fields
    if (!fileId || !key) {
      return NextResponse.json(
        { error: 'Missing required fields: fileId, key' },
        { status: 400 }
      );
    }
    
    // Get user from Supabase
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    let authenticatedSupabase = supabase; // Default to unauthenticated client
    
    if (authHeader) {
      try {
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
      } catch (authError) {
        console.warn('[Process Upload] Auth error:', authError);
      }
    }
    
    // Download file from storage
    console.log(`[Process Upload] Downloading file from storage: ${key}`);
    const s3 = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'moonscribe-uploads';
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const response = await s3.send(command);
    
    // Get file metadata
    const metadata = response.Metadata || {};
    const originalFilename = metadata.originalFilename || 'file';
    const fileType = response.ContentType || 'application/pdf';
    const fileSize = parseInt(metadata.fileSize || '0', 10);
    
    // Convert stream to buffer
    const fileChunks: Uint8Array[] = [];
    if (response.Body) {
      for await (const chunk of response.Body as any) {
        fileChunks.push(chunk);
      }
    }
    const buffer = Buffer.concat(fileChunks);
    
    // Create File-like object for processing
    const file = new File([buffer], originalFilename, { type: fileType });
    
    console.log(`[Process Upload] Downloaded ${(fileSize / (1024 * 1024)).toFixed(2)}MB file: ${originalFilename}`);
    
    // Detect file type and route to appropriate processing
    const isImage = fileType.startsWith('image/');
    const isAudio = fileType.startsWith('audio/') || 
                   originalFilename.toLowerCase().endsWith('.mp3') ||
                   originalFilename.toLowerCase().endsWith('.wav') ||
                   originalFilename.toLowerCase().endsWith('.m4a');
    
    // For now, handle PDFs here. Images and audio should use their respective routes
    // In a full implementation, we'd route to /api/image/process or /api/audio/process
    if (isImage || isAudio) {
      return NextResponse.json(
        { 
          error: 'Image and audio processing from storage not yet implemented. Please use direct upload for now.',
          fileType,
        },
        { status: 501 } // Not Implemented
      );
    }
    
    // Process PDF (reuse logic from /api/upload/route.ts)
    let data;
    let text: string;
    let pageCount: number;
    let isOcrRequired = false;
    let ocrWarning: string | null = null;
    
    try {
      data = await pdf(buffer);
      text = data.text;
      pageCount = data.numpages || 1;
      
      // Check if PDF is likely scanned/image-based
      const avgCharsPerPage = text.length / pageCount;
      const minExpectedCharsPerPage = 100;
      
      if (avgCharsPerPage < minExpectedCharsPerPage && pageCount > 0) {
        isOcrRequired = true;
        ocrWarning = `This PDF appears to be scanned or image-based (only ${Math.round(avgCharsPerPage)} characters per page detected). Text extraction may be incomplete.`;
      }
      
      if (!text || text.trim().length === 0) {
        return NextResponse.json({ 
          error: 'This PDF contains no extractable text. It may be a scanned document or contain only images.',
          isScannedPdf: true,
          pageCount,
        }, { status: 400 });
      }
      
    } catch (pdfError: any) {
      console.error('[Process Upload] PDF parsing error:', pdfError);
      
      if (pdfError.message?.includes('password') || 
          pdfError.message?.includes('encrypted') ||
          pdfError.message?.includes('Password')) {
        return NextResponse.json({ 
          error: 'This PDF is password-protected. Please remove the password protection.',
          isPasswordProtected: true,
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: `Failed to process PDF: ${pdfError.message}`,
      }, { status: 400 });
    }
    
    // Credit cost calculation
    const creditCostPerPage = await getCreditCost('upload_document_page');
    const totalCreditCost = creditCostPerPage * pageCount;
    
    // Determine API key source (same logic as upload route)
    let openaiKey: string | null = null;
    let keySource: 'byok' | 'team' | 'credits' = 'credits';
    let teamName: string | null = null;
    const serverOpenAIKey = process.env.OPENAI_API_KEY;
    
    if (apiKey) {
      openaiKey = apiKey;
      keySource = 'byok';
      console.log('[Process Upload] Using BYOK key');
    } else if (userId) {
      const teamResult = await getTeamApiKey(userId);
      if (teamResult.hasKey && teamResult.apiKey) {
        openaiKey = teamResult.apiKey;
        keySource = 'team';
        teamName = teamResult.teamName;
        console.log(`[Process Upload] Using Team API key from "${teamName}"`);
      }
    }
    
    if (!openaiKey) {
      if (!serverOpenAIKey) {
        return NextResponse.json({ 
          error: 'Server AI not configured. Please use BYOK mode or join a team.' 
        }, { status: 503 });
      }
      
      if (!userId) {
        return NextResponse.json({ 
          error: 'Please sign in to use credits, add your own API key, or join a team.' 
        }, { status: 401 });
      }
      
      const balance = await getBalance(userId, authenticatedSupabase);
      if (balance < totalCreditCost) {
        return NextResponse.json({ 
          error: `Insufficient credits. This ${pageCount}-page document needs ${totalCreditCost} credits but you have ${balance}.`,
          creditsNeeded: totalCreditCost,
          currentBalance: balance,
          pageCount,
        }, { status: 402 });
      }
      
      openaiKey = serverOpenAIKey;
      keySource = 'credits';
    }
    
    const isUsingBYOK = keySource !== 'credits';
    const openai = new OpenAI({ apiKey: openaiKey });
    
    // Create document record in Supabase
    let documentId: string | null = null;
    if (userId) {
      try {
        const document = await createDocument({
          user_id: userId,
          collection_id: projectId || null,
          filename: originalFilename,
          original_filename: originalFilename,
          file_size: fileSize,
          file_type: fileType,
          chunk_count: 0,
          status: 'processing',
          metadata: {
            page_count: pageCount,
            word_count: text.split(/\s+/).length,
            extracted_at: new Date().toISOString(),
            source: 'storage', // Mark as from storage
            storage_key: key,
          },
        });
        documentId = document.id;
      } catch (dbError) {
        console.warn('Failed to create document record:', dbError);
      }
    }
    
    // Chunk text (reuse chunking function from upload route)
    const chunks = chunkText(text, 1500);
    
    // Generate embeddings
    let totalEmbeddingTokens = 0;
    const embeddings = await Promise.all(
      chunks.map(async (chunk, idx) => {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: chunk,
        });
        
        totalEmbeddingTokens += response.usage.total_tokens;
        
        const metadata: Record<string, any> = {
          text: chunk,
          source: originalFilename,
          chunk_index: idx,
        };
        
        if (documentId) {
          metadata.document_id = documentId;
        }
        
        return {
          id: `${originalFilename}-chunk-${idx}`,
          values: response.data[0].embedding,
          metadata,
        };
      })
    );
    
    // Store in Pinecone
    await getIndex().upsert(embeddings);
    
    // Update document status
    if (documentId && userId) {
      try {
        await updateDocumentStatus(documentId, 'ready', chunks.length);
        
        const embeddingCost = estimateOpenAICost('embedding', totalEmbeddingTokens);
        await logUsage({
          user_id: userId,
          api_key_id: null,
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
    
    // Deduct credits
    let remainingBalance: number | null = null;
    if (!isUsingBYOK && userId && totalCreditCost > 0) {
      try {
        const deductResult = await deductCredits(userId, 'upload_document_page', {
          description: `Uploaded: ${originalFilename} (${pageCount} pages)`,
          referenceId: documentId || undefined,
          referenceType: 'document',
          metadata: { filename: originalFilename, pageCount, chunks: chunks.length },
        }, authenticatedSupabase);
        
        if (deductResult.success) {
          remainingBalance = deductResult.balance;
        }
      } catch (deductError) {
        console.error('[Process Upload] Error deducting credits:', deductError);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      chunks: chunks.length,
      filename: originalFilename,
      documentId,
      pageCount,
      warning: ocrWarning || undefined,
      isOcrRequired: isOcrRequired || undefined,
      credits: keySource === 'credits' ? {
        used: totalCreditCost,
        remaining: remainingBalance,
      } : undefined,
      mode: keySource,
      teamName: keySource === 'team' ? teamName : undefined,
    });
    
  } catch (error: any) {
    console.error('[Process Upload] Error:', error);
    
    if (error.message?.includes('not configured')) {
      return NextResponse.json(
        { error: 'Storage service not configured', details: error.message },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to process file' },
      { status: 500 }
    );
  }
}

// Reuse chunking function from upload route
function chunkText(text: string, maxTokens: number): string[] {
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // Rough token estimation: 1 token ≈ 4 characters
    const paragraphTokens = paragraph.length / 4;
    
    if (currentChunk.length === 0) {
      currentChunk = paragraph;
    } else if ((currentChunk.length + paragraph.length) / 4 <= maxTokens) {
      currentChunk += '\n\n' + paragraph;
    } else {
      // Current chunk is full, save it and start new one
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}
