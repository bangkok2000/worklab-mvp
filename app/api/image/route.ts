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

// Supported image formats
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB max

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string | null;
    const apiKey = formData.get('apiKey') as string | null; // BYOK: User's OpenAI key
    const extractText = formData.get('extractText') === 'true'; // Use OCR to extract text
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return NextResponse.json({ 
        error: `Unsupported image format: ${file.type}. Supported formats: JPEG, PNG, GIF, WebP`,
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

    console.log(`[Image] Processing: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)`);

    // Get user from Supabase
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Credit action for image processing (uses GPT-4 Vision)
    const creditAction: CreditAction = 'ask_gpt4o'; // Using GPT-4o Vision pricing
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
      console.log('[Image] Using BYOK (user-provided) key');
    }
    // 2. Check for team API key
    else if (userId) {
      const teamResult = await getTeamApiKey(userId);
      if (teamResult.hasKey && teamResult.apiKey) {
        openaiKey = teamResult.apiKey;
        keySource = 'team';
        teamName = teamResult.teamName;
        console.log(`[Image] Using Team API key from "${teamName}"`);
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
      
      // Get credit cost for this action
      creditCost = await getCreditCost(creditAction);
      
      // Check if user has enough credits
      const balance = await getBalance(userId);
      if (balance < creditCost) {
        return NextResponse.json({ 
          error: `Insufficient credits. You need ${creditCost} credits but have ${balance}. Buy more credits, use your own API key, or join a team.`,
          creditsNeeded: creditCost,
          currentBalance: balance,
        }, { status: 402 });
      }
      
      openaiKey = serverOpenAIKey;
      keySource = 'credits';
      console.log(`[Image] Credits mode: User ${userId} has ${balance} credits, action costs ${creditCost}`);
    }
    
    if (!openaiKey) {
      return NextResponse.json({ 
        error: 'No API key available. Please add your OpenAI API key in Settings, join a team, or sign in to use credits.' 
      }, { status: 401 });
    }
    
    const isUsingBYOK = keySource !== 'credits';

    // Convert image to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Use GPT-4 Vision to analyze the image
    const openai = new OpenAI({ apiKey: openaiKey });
    
    // Build the prompt based on whether we want text extraction or description
    let systemPrompt: string;
    let userPrompt: string;
    
    if (extractText) {
      systemPrompt = `You are an OCR and text extraction expert. Your job is to extract ALL readable text from images accurately.`;
      userPrompt = `Please extract all text visible in this image. Maintain the original structure and formatting as much as possible. Include:
- All headings and titles
- Body text and paragraphs
- Text in tables, charts, or diagrams
- Captions and labels
- Any handwritten text if readable

If there is no readable text, describe what you see instead. Format the output clearly.`;
    } else {
      systemPrompt = `You are an expert image analyst. Your job is to provide detailed, searchable descriptions of images.`;
      userPrompt = `Please analyze this image and provide:

1. **Description**: A detailed description of what the image contains (2-3 sentences)
2. **Key Elements**: List the main objects, people, or elements visible
3. **Text Content**: Any text visible in the image
4. **Context**: The likely context or purpose of this image
5. **Tags**: 5-10 relevant keywords for searching

Be thorough - this description will be used for semantic search.`;
    }

    console.log(`[Image] Sending to GPT-4 Vision for ${extractText ? 'text extraction' : 'analysis'}`);
    
    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: userPrompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: dataUrl,
                detail: 'high' // Use high detail for better text extraction
              } 
            },
          ] 
        },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    const analysisResult = visionResponse.choices[0].message.content || '';
    const tokensUsed = visionResponse.usage?.total_tokens || 0;
    
    console.log(`[Image] Vision analysis complete (${tokensUsed} tokens)`);

    // Generate embedding for the analysis
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: analysisResult,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Create unique ID for this image
    const imageId = `image-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;

    // Prepare vector for Pinecone
    const vector = {
      id: imageId,
      values: embedding,
      metadata: {
        text: analysisResult,
        source: file.name,
        source_type: 'image',
        image_type: file.type,
        file_size: file.size,
        extracted_text: extractText,
        project_id: projectId || null,
        processed_at: new Date().toISOString(),
      },
    };

    // Upsert to Pinecone
    const index = getIndex();
    await index.upsert([vector]);

    console.log(`[Image] Indexed in Pinecone: ${imageId}`);

    // Deduct credits if using credits mode
    let remainingBalance: number | null = null;
    if (!isUsingBYOK && userId && creditCost > 0) {
      try {
        const deductResult = await deductCredits(userId, creditAction, {
          description: `Processed image: "${file.name.substring(0, 40)}${file.name.length > 40 ? '...' : ''}"`,
          referenceType: 'document',
          referenceId: imageId,
          metadata: { filename: file.name, type: file.type, tokens: tokensUsed },
        });
        
        if (deductResult.success) {
          remainingBalance = deductResult.balance;
          console.log(`[Image] Deducted ${creditCost} credits from user ${userId}, remaining: ${remainingBalance}`);
        } else {
          console.error('[Image] Failed to deduct credits:', deductResult.error);
        }
      } catch (deductError) {
        console.error('[Image] Error deducting credits:', deductError);
      }
    }

    return NextResponse.json({
      success: true,
      imageId,
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      analysis: analysisResult,
      extractedText: extractText,
      tokensUsed,
      // Credit usage info (only for credits mode)
      credits: keySource === 'credits' ? {
        used: creditCost,
        remaining: remainingBalance,
      } : undefined,
      mode: keySource,
      teamName: keySource === 'team' ? teamName : undefined,
    });

  } catch (error: any) {
    console.error('[Image] Error:', error);
    
    // Handle specific OpenAI errors
    if (error.message?.includes('Could not process image') || 
        error.message?.includes('Invalid image')) {
      return NextResponse.json({ 
        error: 'Failed to process image. The image may be corrupted or in an unsupported format.',
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint to check supported formats
export async function GET() {
  return NextResponse.json({
    supportedFormats: SUPPORTED_FORMATS,
    maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
    features: {
      textExtraction: true,
      imageAnalysis: true,
      visionModel: 'gpt-4o',
    },
  });
}
