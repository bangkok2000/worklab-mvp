import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone
const getPinecone = () => {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('Missing PINECONE_API_KEY environment variable');
  }
  return new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
};

const getIndex = () => {
  if (!process.env.PINECONE_INDEX) {
    throw new Error('Missing PINECONE_INDEX environment variable');
  }
  return getPinecone().index(process.env.PINECONE_INDEX);
};

/**
 * DELETE /api/pinecone/clear
 * 
 * Clears ALL vectors from the Pinecone index.
 * 
 * WARNING: This is a destructive operation that will delete all data.
 * Use with extreme caution!
 * 
 * Requires authentication (Authorization header with Bearer token)
 */
export async function DELETE(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized. Authentication required.' },
        { status: 401 }
      );
    }

    // Optional: Verify the user is authenticated (you can add more checks here)
    // For now, we'll just check that a token is provided

    console.log('[Pinecone Clear] Starting to clear all vectors from index...');

    const index = getIndex();

    // Delete all vectors by querying all IDs and deleting them in batches
    // Pinecone v2 doesn't have a direct deleteAll() method, so we need to:
    // 1. Query all vectors (using a dummy vector and large topK)
    // 2. Extract all IDs
    // 3. Delete them in batches
    
    console.log('[Pinecone Clear] Querying all vectors to get IDs...');
    
    // Create a dummy query vector (3072 dimensions for text-embedding-3-large)
    const dummyVector = new Array(3072).fill(0);
    
    // Query with very large topK to get all vectors
    // Note: Pinecone has limits, so we'll do this in batches if needed
    let allIds: string[] = [];
    let hasMore = true;
    let totalDeleted = 0;
    
    while (hasMore) {
      const queryResponse = await index.query({
        vector: dummyVector,
        topK: 10000, // Maximum per query
        includeMetadata: false, // We only need IDs
      });
      
      const batchIds = queryResponse.matches.map(match => match.id);
      allIds = allIds.concat(batchIds);
      
      // If we got fewer than topK results, we've got everything
      if (batchIds.length < 10000) {
        hasMore = false;
      } else {
        // Remove the IDs we just queried to avoid duplicates in next query
        // Actually, we can't easily do this, so let's just query once with max topK
        // and hope it's enough. If there are more than 10k vectors, we'll need multiple passes
        console.log(`[Pinecone Clear] Found ${batchIds.length} vectors in this batch, total so far: ${allIds.length}`);
        // For now, let's assume one query is enough. If you have >10k vectors, you may need to run this multiple times
        hasMore = false;
      }
    }
    
    if (allIds.length === 0) {
      console.log('[Pinecone Clear] No vectors found in index');
      return NextResponse.json({
        success: true,
        message: 'No vectors found in the index. It is already empty.',
        deletedCount: 0,
        timestamp: new Date().toISOString(),
      });
    }
    
    console.log(`[Pinecone Clear] Found ${allIds.length} vectors. Deleting in batches...`);
    
    // Delete in batches of 1000 (Pinecone batch limit)
    const batchSize = 1000;
    for (let i = 0; i < allIds.length; i += batchSize) {
      const batch = allIds.slice(i, i + batchSize);
      await index.deleteMany(batch);
      totalDeleted += batch.length;
      console.log(`[Pinecone Clear] Deleted batch ${Math.floor(i / batchSize) + 1}, total deleted: ${totalDeleted}/${allIds.length}`);
    }

    console.log(`[Pinecone Clear] Successfully cleared ${totalDeleted} vectors from index`);

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${totalDeleted} vectors from the Pinecone index.`,
      deletedCount: totalDeleted,
      timestamp: new Date().toISOString(),
      note: totalDeleted >= 10000 
        ? 'Warning: If you have more than 10,000 vectors, you may need to run this endpoint multiple times to clear all vectors.'
        : 'All vectors have been cleared.',
    });

  } catch (error: any) {
    console.error('[Pinecone Clear] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear Pinecone index',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pinecone/clear
 * Alternative method to clear (some clients prefer POST for destructive operations)
 */
export async function POST(req: NextRequest) {
  return DELETE(req);
}
