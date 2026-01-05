import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import pdf from 'pdf-parse';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.index(process.env.PINECONE_INDEX!);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text from PDF
    const data = await pdf(buffer);
    const text = data.text;

    // Chunk text into ~500 token pieces
    const chunks = chunkText(text, 500);
    
    // Generate embeddings for all chunks
    const embeddings = await Promise.all(
      chunks.map(async (chunk, idx) => {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: chunk,
        });
        
        return {
          id: `${file.name}-chunk-${idx}`,
          values: response.data[0].embedding,
          metadata: {
            text: chunk,
            source: file.name,
            chunk_index: idx,
          }
        };
      })
    );

    // Store in Pinecone
    await index.upsert(embeddings);

    return NextResponse.json({ 
      success: true, 
      chunks: chunks.length,
      filename: file.name 
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function chunkText(text: string, maxTokens: number): string[] {
  // Simple chunking by characters (rough ~4 chars per token)
  const chunkSize = maxTokens * 4;
  const chunks: string[] = [];
  
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  
  return chunks;
}