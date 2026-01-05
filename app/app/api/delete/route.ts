import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.index(process.env.PINECONE_INDEX!);

export async function POST(req: NextRequest) {
  try {
    const { filename } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: 'No filename provided' }, { status: 400 });
    }

    // Query Pinecone to find all vectors for this file
    // We need to delete by ID, so first we need to find all chunk IDs for this file
    // Since Pinecone doesn't support "delete by metadata" directly, we need to:
    // 1. Query to get all vectors with this filename
    // 2. Extract their IDs
    // 3. Delete those IDs

    // Create a dummy query vector (we just need any vector to search)
    // We'll filter by metadata to get all chunks from this file
    const dummyVector = new Array(3072).fill(0); // 3072 dimensions for text-embedding-3-large

    // Query with metadata filter to find all chunks from this file
    const queryResponse = await index.query({
      vector: dummyVector,
      topK: 10000, // Get up to 10k chunks (should be more than enough)
      filter: {
        source: { $eq: filename }
      },
      includeMetadata: true,
    });

    if (queryResponse.matches.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No chunks found for this file',
        deletedCount: 0 
      });
    }

    // Extract all IDs
    const idsToDelete = queryResponse.matches.map(match => match.id);

    // Delete all chunks for this file
    await index.deleteMany(idsToDelete);

    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${idsToDelete.length} chunks from ${filename}`,
      deletedCount: idsToDelete.length
    });

  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}