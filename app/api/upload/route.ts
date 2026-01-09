import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import pdf from 'pdf-parse';
import { createServerClient } from '@/lib/supabase/client';
import { createDocument, updateDocumentStatus } from '@/lib/supabase/documents';
import { estimateOpenAICost, logUsage } from '@/lib/supabase/usage';

// Note: BYOK - OpenAI API key comes from client for embeddings

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const collectionId = formData.get('collectionId') as string | null;
    const apiKey = formData.get('apiKey') as string | null; // BYOK: User's OpenAI key
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // BYOK: User must provide their own API key for embeddings
    const openaiKey = apiKey || process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ 
        error: 'API key required. Please add your OpenAI API key in Settings.' 
      }, { status: 401 });
    }
    
    const openai = new OpenAI({ apiKey: openaiKey });

    // Get user from Supabase (for now, we'll support anonymous users)
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text from PDF
    const data = await pdf(buffer);
    const text = data.text;

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
            page_count: data.numpages || null,
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

    return NextResponse.json({ 
      success: true, 
      chunks: chunks.length,
      filename: file.name,
      documentId,
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