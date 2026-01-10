import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { createServerClient } from '@/lib/supabase/client';
import { expandQuery } from '@/lib/utils/query-expansion';
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

export async function POST(req: NextRequest) {
  try {
    const { 
      sourceFilenames,
      apiKey, // User-provided API key (optional - for BYOK)
      provider = 'openai', // Provider: 'openai' | 'anthropic'
      model, // Model name (optional, uses default if not provided)
      count = 10, // Number of flashcards to generate
    } = await req.json();

    if (!sourceFilenames || !Array.isArray(sourceFilenames) || sourceFilenames.length === 0) {
      return NextResponse.json({ error: 'No source files provided' }, { status: 400 });
    }

    // Get user from Supabase
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Determine which model/action for credit costs
    const selectedModel = model || (provider === 'openai' ? 'gpt-3.5-turbo' : 'claude-3-sonnet-20240229');
    const isGPT4 = selectedModel.includes('gpt-4') && !selectedModel.includes('gpt-4o');
    const isGPT4o = selectedModel.includes('gpt-4o');
    const isClaude = provider === 'anthropic';
    
    // Map to credit action (same as ask endpoint)
    let creditAction: CreditAction = 'ask_gpt35';  // Default: 1 credit
    if (isGPT4) creditAction = 'ask_gpt4';         // 10 credits
    else if (isGPT4o) creditAction = 'ask_gpt4o'; // 5 credits
    else if (isClaude) creditAction = 'ask_claude'; // 5 credits
    
    // Determine API key source (priority: user BYOK > team key > server credits)
    let openaiKey: string | null = null;
    let keySource: 'byok' | 'team' | 'credits' = 'credits';
    let teamName: string | null = null;
    let creditCost = 0;
    const serverOpenAIKey = process.env.OPENAI_API_KEY;
    
    // 1. Check for user-provided BYOK key (highest priority)
    if (apiKey) {
      openaiKey = apiKey;
      keySource = 'byok';
      console.log('[Flashcards API] Using user-provided BYOK key');
    } 
    // 2. Check for team API key (if user is in a team)
    else if (userId) {
      const teamKey = await getTeamApiKey(userId);
      if (teamKey) {
        openaiKey = teamKey.apiKey;
        keySource = 'team';
        teamName = teamKey.teamName;
        console.log(`[Flashcards API] Using team API key from team: ${teamName}`);
      }
    }
    
    // 3. Fallback to server credits
    if (!openaiKey) {
      if (!serverOpenAIKey) {
        return NextResponse.json({ 
          error: 'No API key available. Please add your OpenAI API key in Settings, join a team, or sign in to use credits.' 
        }, { status: 401 });
      }
      
      // Check credits if using credits mode
      if (userId) {
        creditCost = await getCreditCost(creditAction);
        const balance = await getBalance(userId);
        if (balance < creditCost) {
          return NextResponse.json({ 
            error: `Insufficient credits. Need ${creditCost} credits but only have ${balance}. Please buy more credits or add your own API key.`,
            balance,
            required: creditCost,
          }, { status: 402 });
        }
        console.log(`[Flashcards API] Will deduct ${creditCost} credits from user ${userId} (current balance: ${balance})`);
      }
      
      openaiKey = serverOpenAIKey;
      keySource = 'credits';
    }
    
    const isUsingBYOK = keySource !== 'credits';
    const openai = new OpenAI({ apiKey: openaiKey });
    
    // Build a query to get comprehensive context for flashcards
    // Use a broad query to get diverse content
    const query = 'key concepts important information main points definitions facts';
    const expandedQuery = expandQuery(query);
    
    // Embed the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: expandedQuery,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Build filter for specific documents
    const filter = {
      source: { $in: sourceFilenames }
    };

    // Search Pinecone - get more results for comprehensive flashcards
    const searchResults = await getIndex().query({
      vector: queryEmbedding,
      topK: 30, // Get more chunks for diverse flashcards
      includeMetadata: true,
      filter: filter,
    });

    // Extract context from results
    const allMatches = searchResults.matches
      .map((match: any) => ({
        text: match.metadata?.text || '',
        source: match.metadata?.source || 'Unknown',
        score: match.score || 0,
        sourceType: match.metadata?.source_type || 'document',
        url: match.metadata?.url,
        startTime: match.metadata?.start_time,
        audioId: match.metadata?.audio_id,
      }))
      .filter((item: any) => item.text && item.text.trim().length > 50); // Filter out very short chunks

    if (allMatches.length === 0) {
      return NextResponse.json({ 
        error: 'No relevant content found in the specified documents.',
        flashcards: []
      });
    }

    // Normalize source names for deduplication
    const normalizeSourceName = (name: string): string => {
      return name.trim().toLowerCase();
    };
    
    // Group matches by source and select diverse chunks
    const bySource = new Map<string, typeof allMatches>();
    const sourceNameMap = new Map<string, string>();
    
    allMatches.forEach(match => {
      const normalized = normalizeSourceName(match.source);
      const originalName = sourceNameMap.get(normalized) || match.source;
      
      if (!sourceNameMap.has(normalized)) {
        sourceNameMap.set(normalized, match.source);
      }
      
      if (!bySource.has(normalized)) {
        bySource.set(normalized, []);
      }
      bySource.get(normalized)!.push(match);
    });

    // Select diverse chunks from each source (2-3 per source)
    const diverseContext: typeof allMatches = [];
    bySource.forEach((matches) => {
      const sortedMatches = matches.sort((a, b) => (b.score || 0) - (a.score || 0));
      diverseContext.push(...sortedMatches.slice(0, 3)); // Top 3 from each source
    });

    // Limit total context to avoid token limits
    diverseContext.sort((a, b) => (b.score || 0) - (a.score || 0));
    const finalContext = diverseContext.slice(0, 20); // Use top 20 chunks

    // Build context text
    const contextText = finalContext
      .map((item, idx) => {
        const normalized = normalizeSourceName(item.source);
        const displayName = sourceNameMap.get(normalized) || item.source;
        return `[${idx + 1}] From ${displayName}:\n${item.text}`;
      })
      .join('\n\n');

    // Build prompt for flashcard generation
    const prompt = `You are an expert educational content creator. Based on the provided context from documents, generate ${count} high-quality flashcards.

Each flashcard should:
- Have a clear, concise question or term on the front
- Have a comprehensive, accurate answer on the back
- Cover important concepts, definitions, facts, or key information
- Be suitable for active recall learning
- Be based ONLY on the provided context

Return your response as a JSON object with this exact structure:
{
  "flashcards": [
    {
      "front": "Question or term",
      "back": "Answer or definition",
      "source": "Source document name"
    },
    ...
  ]
}

CONTEXT FROM DOCUMENTS:
${contextText}

Generate exactly ${count} flashcards. Return ONLY the JSON object, no other text.`;

    // Get flashcards from selected provider/model
    let completion: any;
    let tokensUsed = 0;
    
    if (provider === 'openai') {
      const result = await openai.chat.completions.create({
        model: selectedModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7, // Slightly higher for creativity
        max_tokens: 2000,
        response_format: { type: 'json_object' }, // Request JSON format
      });
      completion = result;
      tokensUsed = result.usage?.total_tokens || 0;
    } else if (provider === 'anthropic' && apiKey) {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });
      
      if (!anthropicRes.ok) {
        const error = await anthropicRes.json();
        throw new Error(error.error?.message || 'Anthropic API error');
      }
      
      const anthropicData = await anthropicRes.json();
      completion = { choices: [{ message: { content: anthropicData.content[0].text } }] };
      tokensUsed = anthropicData.usage?.input_tokens + anthropicData.usage?.output_tokens || 0;
    } else {
      // Fallback to OpenAI
      const result = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });
      completion = result;
      tokensUsed = result.usage?.total_tokens || 0;
    }

    const responseText = completion.choices[0].message.content;
    
    // Parse JSON response
    let flashcards: Array<{ front: string; back: string; source: string }> = [];
    try {
      // Parse as JSON object
      const parsed = JSON.parse(responseText);
      
      // Handle different response formats
      if (Array.isArray(parsed)) {
        flashcards = parsed;
      } else if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
        flashcards = parsed.flashcards;
      } else if (parsed.cards && Array.isArray(parsed.cards)) {
        flashcards = parsed.cards;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('[Flashcards API] Failed to parse JSON response:', error);
      console.error('[Flashcards API] Response text:', responseText);
      
      // Fallback: try to extract JSON array from response
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          flashcards = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (fallbackError) {
        return NextResponse.json({ 
          error: 'Failed to parse flashcards from AI response. Please try again.',
          rawResponse: responseText.substring(0, 500),
        }, { status: 500 });
      }
    }

    // Validate and format flashcards
    const formattedFlashcards = flashcards
      .filter((card: any) => card.front && card.back)
      .slice(0, count) // Ensure we don't exceed requested count
      .map((card: any, idx: number) => ({
        id: `flashcard-${Date.now()}-${idx}`,
        front: card.front.trim(),
        back: card.back.trim(),
        source: card.source || sourceFilenames[0] || 'Unknown',
        createdAt: new Date(),
      }));

    // Deduct credits if using credits mode
    let remainingBalance: number | null = null;
    if (!isUsingBYOK && userId && creditCost > 0) {
      try {
        const deductResult = await deductCredits(userId, creditAction, {
          description: `Generated ${formattedFlashcards.length} flashcards`,
          referenceType: 'study-tools',
          metadata: { model: selectedModel, tokens: tokensUsed, count: formattedFlashcards.length },
        });
        
        if (deductResult.success) {
          remainingBalance = deductResult.balance;
          console.log(`[Flashcards API] Deducted ${creditCost} credits from user ${userId}, remaining: ${remainingBalance}`);
        }
      } catch (error) {
        console.error('[Flashcards API] Failed to deduct credits:', error);
        // Don't fail the request if credit deduction fails
      }
    }

    return NextResponse.json({
      flashcards: formattedFlashcards,
      sources: Array.from(new Set(formattedFlashcards.map((f: any) => f.source))),
      keySource,
      teamName,
      remainingBalance,
      tokensUsed,
    });

  } catch (error: any) {
    console.error('[Flashcards API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate flashcards' },
      { status: 500 }
    );
  }
}
