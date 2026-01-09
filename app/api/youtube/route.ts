import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { createServerClient } from '@/lib/supabase/client';
import { getBalance, deductCredits, getCreditCost } from '@/lib/supabase/credits';
import type { CreditAction } from '@/lib/supabase/types';

// Lazy initialization for Pinecone
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

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Short URL: https://youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed URL: https://www.youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Mobile URL: https://m.youtube.com/watch?v=VIDEO_ID
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Shorts URL: https://www.youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Check if it's just a video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  return null;
}

// Fetch video metadata using oEmbed (no API key required)
async function getVideoMetadata(videoId: string): Promise<{
  title: string;
  author: string;
  thumbnail: string;
  duration?: number;
}> {
  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oEmbedUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch video metadata');
    }
    
    const data = await response.json();
    
    return {
      title: data.title || 'Untitled Video',
      author: data.author_name || 'Unknown',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };
  } catch (error) {
    console.warn('Failed to fetch oEmbed metadata, using defaults:', error);
    return {
      title: 'YouTube Video',
      author: 'Unknown',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

// Format timestamp for display (seconds to MM:SS or HH:MM:SS)
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Chunk transcript with timestamps
// Each chunk is roughly 1000-1500 characters, preserving sentence boundaries
interface TranscriptChunk {
  text: string;
  startTime: number;
  endTime: number;
  startTimestamp: string;
  endTimestamp: string;
}

function chunkTranscript(
  transcript: Array<{ text: string; offset: number; duration: number }>,
  targetChunkSize: number = 1200
): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  let currentChunk: typeof transcript = [];
  let currentLength = 0;

  for (const segment of transcript) {
    const segmentText = segment.text.trim();
    
    // If adding this segment would exceed target size and we have content
    if (currentLength + segmentText.length > targetChunkSize && currentChunk.length > 0) {
      // Check if we're at a natural break point (end of sentence)
      const lastText = currentChunk[currentChunk.length - 1].text;
      const isNaturalBreak = /[.!?]$/.test(lastText.trim());
      
      // If not at natural break and chunk is small, keep adding
      if (!isNaturalBreak && currentLength < targetChunkSize * 0.7) {
        currentChunk.push(segment);
        currentLength += segmentText.length + 1;
        continue;
      }
      
      // Save current chunk
      const startTime = currentChunk[0].offset / 1000; // Convert ms to seconds
      const lastSegment = currentChunk[currentChunk.length - 1];
      const endTime = (lastSegment.offset + lastSegment.duration) / 1000;
      
      chunks.push({
        text: currentChunk.map(s => s.text.trim()).join(' '),
        startTime,
        endTime,
        startTimestamp: formatTimestamp(startTime),
        endTimestamp: formatTimestamp(endTime),
      });
      
      // Start new chunk
      currentChunk = [segment];
      currentLength = segmentText.length;
    } else {
      currentChunk.push(segment);
      currentLength += segmentText.length + 1;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    const startTime = currentChunk[0].offset / 1000;
    const lastSegment = currentChunk[currentChunk.length - 1];
    const endTime = (lastSegment.offset + lastSegment.duration) / 1000;
    
    chunks.push({
      text: currentChunk.map(s => s.text.trim()).join(' '),
      startTime,
      endTime,
      startTimestamp: formatTimestamp(startTime),
      endTimestamp: formatTimestamp(endTime),
    });
  }

  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const { 
      url,
      projectId,
      apiKey, // User-provided API key (optional - for BYOK)
    } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'No YouTube URL provided' }, { status: 400 });
    }

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ 
        error: 'Invalid YouTube URL. Please provide a valid YouTube video link.' 
      }, { status: 400 });
    }

    console.log(`[YouTube] Processing video: ${videoId}`);

    // Get user from Supabase
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Determine mode: BYOK (user's key) or Credits (server key)
    const isUsingBYOK = !!apiKey;
    const serverOpenAIKey = process.env.OPENAI_API_KEY;
    
    // Credit action for YouTube processing
    const creditAction: CreditAction = 'process_youtube';
    let creditCost = 0;
    
    // If using Credits (not BYOK), check balance first
    if (!isUsingBYOK) {
      if (!serverOpenAIKey) {
        return NextResponse.json({ 
          error: 'Server AI not configured. Please use BYOK mode (add your API key in Settings).' 
        }, { status: 503 });
      }
      
      if (!userId) {
        return NextResponse.json({ 
          error: 'Please sign in to use credits, or add your own API key in Settings.' 
        }, { status: 401 });
      }
      
      // Get credit cost for this action
      creditCost = await getCreditCost(creditAction);
      
      // Check if user has enough credits
      const balance = await getBalance(userId);
      if (balance < creditCost) {
        return NextResponse.json({ 
          error: `Insufficient credits. You need ${creditCost} credits but have ${balance}. Buy more credits or use your own API key.`,
          creditsNeeded: creditCost,
          currentBalance: balance,
        }, { status: 402 });
      }
      
      console.log(`[YouTube] Credits mode: User ${userId} has ${balance} credits, action costs ${creditCost}`);
    }
    
    // Determine which API key to use
    const openaiKey = isUsingBYOK ? apiKey : serverOpenAIKey;
    
    if (!openaiKey) {
      return NextResponse.json({ 
        error: 'No API key available. Please add your OpenAI API key in Settings or sign in to use credits.' 
      }, { status: 401 });
    }

    // Fetch video metadata
    const metadata = await getVideoMetadata(videoId);
    console.log(`[YouTube] Video: "${metadata.title}" by ${metadata.author}`);

    // Fetch transcript
    let rawTranscript;
    try {
      rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (transcriptError: any) {
      console.error('[YouTube] Transcript error:', transcriptError);
      
      // Common error cases
      if (transcriptError.message?.includes('disabled')) {
        return NextResponse.json({ 
          error: 'Transcripts are disabled for this video. The video owner has turned off captions.' 
        }, { status: 400 });
      }
      if (transcriptError.message?.includes('unavailable') || transcriptError.message?.includes('not found')) {
        return NextResponse.json({ 
          error: 'No transcript available for this video. Try a video with captions enabled.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: `Could not fetch transcript: ${transcriptError.message}` 
      }, { status: 400 });
    }

    if (!rawTranscript || rawTranscript.length === 0) {
      return NextResponse.json({ 
        error: 'This video has no transcript available. Try a video with captions enabled.' 
      }, { status: 400 });
    }

    console.log(`[YouTube] Got ${rawTranscript.length} transcript segments`);

    // Chunk the transcript
    const chunks = chunkTranscript(rawTranscript);
    console.log(`[YouTube] Created ${chunks.length} chunks`);

    // Generate embeddings using OpenAI
    const openai = new OpenAI({ apiKey: openaiKey });
    
    const embeddings = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: chunk.text,
        });
        return response.data[0].embedding;
      })
    );

    console.log(`[YouTube] Generated ${embeddings.length} embeddings`);

    // Prepare vectors for Pinecone
    const vectors = chunks.map((chunk, idx) => ({
      id: `youtube-${videoId}-chunk-${idx}`,
      values: embeddings[idx],
      metadata: {
        text: chunk.text,
        source: metadata.title,
        source_type: 'youtube',
        video_id: videoId,
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
        video_author: metadata.author,
        thumbnail: metadata.thumbnail,
        start_time: chunk.startTime,
        end_time: chunk.endTime,
        start_timestamp: chunk.startTimestamp,
        end_timestamp: chunk.endTimestamp,
        timestamp_url: `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(chunk.startTime)}`,
        project_id: projectId || null,
        chunk_index: idx,
        total_chunks: chunks.length,
        processed_at: new Date().toISOString(),
      },
    }));

    // Upsert to Pinecone
    const index = getIndex();
    
    // Batch upsert (Pinecone recommends batches of 100)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    console.log(`[YouTube] Upserted ${vectors.length} vectors to Pinecone`);

    // Deduct credits if using credits mode (not BYOK)
    let remainingBalance: number | null = null;
    if (!isUsingBYOK && userId && creditCost > 0) {
      try {
        const deductResult = await deductCredits(userId, creditAction, {
          description: `Processed YouTube: "${metadata.title.substring(0, 40)}${metadata.title.length > 40 ? '...' : ''}"`,
          referenceType: 'document',
          referenceId: videoId,
          metadata: { videoId, title: metadata.title, chunks: chunks.length },
        });
        
        if (deductResult.success) {
          remainingBalance = deductResult.balance;
          console.log(`[YouTube] Deducted ${creditCost} credits from user ${userId}, remaining: ${remainingBalance}`);
        } else {
          console.error('[YouTube] Failed to deduct credits:', deductResult.error);
        }
      } catch (deductError) {
        console.error('[YouTube] Error deducting credits:', deductError);
      }
    }

    // Calculate total duration from last chunk
    const totalDuration = chunks.length > 0 ? chunks[chunks.length - 1].endTime : 0;

    return NextResponse.json({
      success: true,
      videoId,
      title: metadata.title,
      author: metadata.author,
      thumbnail: metadata.thumbnail,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      chunksProcessed: chunks.length,
      totalDuration: formatTimestamp(totalDuration),
      // Credit usage info (only for credits mode)
      credits: !isUsingBYOK ? {
        used: creditCost,
        remaining: remainingBalance,
      } : undefined,
      mode: isUsingBYOK ? 'byok' : 'credits',
    });

  } catch (error: any) {
    console.error('[YouTube] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint to check if a video has transcript available
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ 
        valid: false,
        error: 'Invalid YouTube URL' 
      });
    }

    // Get metadata
    const metadata = await getVideoMetadata(videoId);
    
    // Try to check if transcript is available
    let hasTranscript = false;
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      hasTranscript = transcript && transcript.length > 0;
    } catch {
      hasTranscript = false;
    }

    return NextResponse.json({
      valid: true,
      videoId,
      title: metadata.title,
      author: metadata.author,
      thumbnail: metadata.thumbnail,
      hasTranscript,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
