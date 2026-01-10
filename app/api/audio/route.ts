import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { createServerClient } from '@/lib/supabase/client';
import { getBalance, deductCredits, getCreditCost } from '@/lib/supabase/credits';
import { getTeamApiKey } from '@/lib/supabase/teams';
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

// Supported audio formats
const SUPPORTED_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max (Whisper supports up to 25MB, but we'll allow larger for chunking)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string | null;
    const apiKey = formData.get('apiKey') as string | null; // BYOK: User's OpenAI key
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const fileType = file.type || '';
    const fileName = file.name.toLowerCase();
    const isAudioFile = SUPPORTED_FORMATS.includes(fileType) || 
                       fileName.endsWith('.mp3') || 
                       fileName.endsWith('.wav') || 
                       fileName.endsWith('.m4a') ||
                       fileName.endsWith('.mp4');

    if (!isAudioFile) {
      return NextResponse.json({ 
        error: `Unsupported audio format: ${file.type || 'unknown'}. Supported formats: MP3, WAV, M4A`,
        supportedFormats: SUPPORTED_FORMATS,
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        maxSizeBytes: MAX_FILE_SIZE,
      }, { status: 400 });
    }

    console.log(`[Audio] Processing: ${file.name} (${file.type || 'unknown'}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Get user from Supabase
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Credit action for audio transcription
    const creditAction: CreditAction = 'transcribe_audio_minute';
    let creditCost = 0;
    
    // Determine API key source (priority: user BYOK > team key > server credits)
    let openaiKey: string | null = null;
    let keySource: 'byok' | 'team' | 'credits' = 'credits';
    let teamName: string | null = null;
    const serverOpenAIKey = process.env.OPENAI_API_KEY;
    
    // 1. Check for user-provided BYOK key (highest priority)
    if (apiKey) {
      openaiKey = apiKey;
      keySource = 'byok';
      console.log('[Audio] Using BYOK (user-provided) key');
    }
    // 2. Check for team API key
    else if (userId) {
      const teamResult = await getTeamApiKey(userId);
      if (teamResult.hasKey && teamResult.apiKey) {
        openaiKey = teamResult.apiKey;
        keySource = 'team';
        teamName = teamResult.teamName;
        console.log(`[Audio] Using Team API key from "${teamName}"`);
      }
    }
    
    // 3. If no BYOK or team key, use credits mode
    if (!openaiKey) {
      if (!serverOpenAIKey) {
        return NextResponse.json({ 
          error: 'No API key available. Please provide your own API key, join a team, or ensure server credits are configured.',
        }, { status: 500 });
      }
      openaiKey = serverOpenAIKey;
      keySource = 'credits';
      
      // Check credits balance before processing
      if (userId) {
        const balance = await getBalance(userId);
        if (balance === null) {
          return NextResponse.json({ 
            error: 'Failed to check credit balance. Please try again.',
          }, { status: 500 });
        }
        
        // Estimate duration (rough: 1MB ≈ 1 minute for compressed audio)
        const estimatedMinutes = Math.max(1, Math.ceil(file.size / (1024 * 1024)));
        creditCost = await getCreditCost(creditAction);
        const totalCost = creditCost * estimatedMinutes;
        
        if (balance < totalCost) {
          return NextResponse.json({ 
            error: `Insufficient credits. Need ${totalCost} credits (estimated ${estimatedMinutes} minutes), but you have ${balance}.`,
            requiredCredits: totalCost,
            currentBalance: balance,
          }, { status: 402 });
        }
      }
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: openaiKey });

    // Convert file to buffer for Whisper API
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create a File-like object for Whisper API
    const audioFile = new File([buffer], file.name, { type: file.type || 'audio/mpeg' });

    console.log('[Audio] Transcribing with Whisper API...');
    
    // Transcribe audio using Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json', // Get timestamps
      timestamp_granularities: ['segment'], // Get segment-level timestamps
    });

    console.log(`[Audio] Transcription complete. Duration: ${transcription.duration}s, Segments: ${transcription.segments?.length || 0}`);

    // Calculate actual duration in minutes for credit deduction
    const durationMinutes = Math.ceil((transcription.duration || 0) / 60);
    
    // Deduct credits if using credits mode
    // Note: deductCredits deducts cost for ONE action, so we need to call it once per minute
    if (keySource === 'credits' && userId && durationMinutes > 0) {
      creditCost = await getCreditCost(creditAction);
      const totalCost = creditCost * durationMinutes;
      
      // Deduct credits once per minute (each minute is one action)
      let lastBalance = 0;
      let allSuccess = true;
      for (let i = 0; i < durationMinutes; i++) {
        const deductResult = await deductCredits(userId, creditAction, {
          description: i === 0 ? `Transcribed audio: ${file.name}` : undefined, // Only add description for first minute
          metadata: i === 0 ? {
            filename: file.name,
            duration_seconds: transcription.duration,
            duration_minutes: durationMinutes,
            minute: i + 1,
            total_minutes: durationMinutes,
          } : {
            minute: i + 1,
            total_minutes: durationMinutes,
          },
        });
        
        if (!deductResult.success) {
          allSuccess = false;
          console.error(`[Audio] Failed to deduct credits for minute ${i + 1}:`, deductResult.error);
          break;
        }
        lastBalance = deductResult.balance;
      }
      
      if (allSuccess) {
        console.log(`[Audio] Deducted ${totalCost} credits (${durationMinutes} min × ${creditCost}) from user ${userId}, remaining: ${lastBalance}`);
      } else {
        console.error('[Audio] Failed to deduct all credits');
      }
    }

    // Get transcript text and segments
    const transcriptText = transcription.text || '';
    const segments = transcription.segments || [];
    
    if (!transcriptText || transcriptText.trim().length === 0) {
      return NextResponse.json({ 
        error: 'No speech detected in audio file. The file may be silent or corrupted.',
      }, { status: 400 });
    }

    // Chunk transcript with timestamps for RAG
    // Each chunk should be ~800 tokens (for embedding model limit)
    const chunks: Array<{ text: string; start: number; end: number; segmentIndex: number }> = [];
    const targetChunkSize = 3000; // ~800 tokens in characters
    
    let currentChunk = '';
    let currentStart = segments[0]?.start || 0;
    let currentEnd = segments[0]?.end || 0;
    let segmentIndex = 0;

    for (const segment of segments) {
      const segmentText = segment.text.trim();
      if (!segmentText) continue;

      // If adding this segment would exceed chunk size, save current chunk
      if (currentChunk && (currentChunk.length + segmentText.length + 1) > targetChunkSize) {
        chunks.push({
          text: currentChunk.trim(),
          start: currentStart,
          end: currentEnd,
          segmentIndex: segmentIndex - 1,
        });
        currentChunk = segmentText;
        currentStart = segment.start;
        currentEnd = segment.end;
      } else {
        if (currentChunk) {
          currentChunk += ' ' + segmentText;
        } else {
          currentChunk = segmentText;
          currentStart = segment.start;
        }
        currentEnd = segment.end;
      }
      segmentIndex++;
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        start: currentStart,
        end: currentEnd,
        segmentIndex: segmentIndex - 1,
      });
    }

    console.log(`[Audio] Created ${chunks.length} chunks from transcript`);

    // Generate embeddings for chunks
    const index = getIndex();
    const openaiEmbeddings = new OpenAI({ apiKey: openaiKey });
    
    const embeddingPromises = chunks.map(chunk => 
      openaiEmbeddings.embeddings.create({
        model: 'text-embedding-3-large',
        input: chunk.text,
      })
    );

    const embeddingResponses = await Promise.all(embeddingPromises);
    const embeddings = embeddingResponses.map(res => res.data[0].embedding);

    // Store in Pinecone with metadata
    const audioId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const filename = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    
    const vectors = chunks.map((chunk, idx) => ({
      id: `${audioId}-chunk-${idx}`,
      values: embeddings[idx],
      metadata: {
        text: chunk.text,
        source: file.name, // Full filename with extension
        source_type: 'audio',
        audio_id: audioId,
        filename: filename,
        start_time: chunk.start,
        end_time: chunk.end,
        segment_index: chunk.segmentIndex,
        duration_seconds: transcription.duration || 0,
        duration_minutes: durationMinutes,
        file_type: file.type || 'audio/mpeg',
        file_size: file.size,
        ...(projectId && projectId.length < 100 && { project_id: projectId }),
        chunk_index: idx,
        total_chunks: chunks.length,
        processed_at: new Date().toISOString(),
      },
    }));

    await index.upsert(vectors);
    console.log(`[Audio] Stored ${vectors.length} chunks in Pinecone`);

    return NextResponse.json({
      success: true,
      audioId,
      filename: file.name,
      fileType: file.type || 'audio/mpeg',
      fileSize: file.size,
      transcript: transcriptText,
      segments: segments.map(s => ({
        start: s.start,
        end: s.end,
        text: s.text,
      })),
      duration: transcription.duration || 0,
      durationMinutes,
      chunks: chunks.length,
      tokensUsed: transcription.duration ? Math.ceil(transcription.duration / 60) * 1000 : 0, // Rough estimate
      // Credit usage info (only for credits mode)
      credits: keySource === 'credits' ? {
        cost: creditCost * durationMinutes,
        balance: keySource === 'credits' && userId ? (await getBalance(userId)) || 0 : undefined,
      } : undefined,
      mode: keySource,
      ...(teamName && { teamName }),
    });

  } catch (error: any) {
    console.error('[Audio] Error processing audio:', error);
    
    // Handle specific OpenAI errors
    if (error.response?.status === 413) {
      return NextResponse.json({ 
        error: 'Audio file is too large. Whisper API supports files up to 25MB. Please compress or split your audio file.',
      }, { status: 413 });
    }
    
    if (error.message?.includes('Invalid file format')) {
      return NextResponse.json({ 
        error: 'Invalid audio file format. Please ensure the file is a valid MP3, WAV, or M4A file.',
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: error.message || 'Failed to process audio file',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
