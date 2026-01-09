import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { createServerClient } from '@/lib/supabase/client';
import { createConversation, addMessage } from '@/lib/supabase/conversations';
import { estimateOpenAICost, estimateAnthropicCost, logUsage } from '@/lib/supabase/usage';
import { expandQuery } from '@/lib/utils/query-expansion';
import { getBalance, deductCredits, getCreditCost } from '@/lib/supabase/credits';
import { getTeamApiKey } from '@/lib/supabase/teams';
import type { CreditAction } from '@/lib/supabase/types';

// Server-side AI: Use Team API Key OR personal BYOK OR Credits

// Lazy initialization for Pinecone to avoid build-time errors
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
      question, 
      conversationId, 
      collectionId, 
      documentIds, 
      sourceFilenames,
      apiKey, // User-provided API key (optional - for BYOK)
      provider = 'openai', // Provider: 'openai' | 'anthropic' | 'google' | 'ollama'
      model, // Model name (optional, uses default if not provided)
    } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
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
    
    // Map to credit action (different costs per model)
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
      console.log('[API] Using BYOK (user-provided) key');
    }
    // 2. Check for team API key
    else if (userId) {
      const teamResult = await getTeamApiKey(userId);
      if (teamResult.hasKey && teamResult.apiKey) {
        openaiKey = teamResult.apiKey;
        keySource = 'team';
        teamName = teamResult.teamName;
        console.log(`[API] Using Team API key from "${teamName}"`);
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
        }, { status: 402 }); // 402 = Payment Required
      }
      
      openaiKey = serverOpenAIKey;
      keySource = 'credits';
      console.log(`[API] Credits mode: User ${userId} has ${balance} credits, action costs ${creditCost}`);
    }
    
    if (!openaiKey) {
      return NextResponse.json({ 
        error: 'No API key available. Please add your OpenAI API key in Settings, join a team, or sign in to use credits.' 
      }, { status: 401 });
    }
    
    const isUsingBYOK = keySource !== 'credits';
    const openai = new OpenAI({ apiKey: openaiKey });
    
    // Expand query for better semantic search recall
    const expandedQuery = expandQuery(question);
    
    // Embed the expanded question (always use OpenAI for embeddings)
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: expandedQuery,
    });

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // Build filter for specific documents if provided
    // Priority: sourceFilenames (works for all users) > documentIds (authenticated only)
    let filter: any = undefined;
    
    if (sourceFilenames && Array.isArray(sourceFilenames) && sourceFilenames.length > 0) {
      // Filter by source filename (works for both authenticated and anonymous users)
      filter = {
        source: { $in: sourceFilenames }
      };
    } else if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      // Filter by document_id if provided (for authenticated users with UUIDs)
      filter = {
        document_id: { $in: documentIds }
      };
    } else if (documentIds && typeof documentIds === 'string') {
      // Single document ID
      filter = {
        document_id: { $eq: documentIds }
      };
    }

    // Search Pinecone - get enough results but not too many
    // We'll filter down to 3-10 chunks based on question complexity
    const searchResults = await getIndex().query({
      vector: questionEmbedding,
      topK: 15, // Reduced from 25 - we'll filter to 3-10 chunks anyway
      includeMetadata: true,
      filter: filter, // Filter by specific documents if provided
    });

    // Extract context from results
    const allMatches = searchResults.matches
      .map(match => ({
        text: match.metadata?.text as string,
        source: match.metadata?.source as string,
        score: match.score,
      }))
      .filter(item => item.text);

    if (allMatches.length === 0) {
      return NextResponse.json({ 
        answer: "I couldn't find relevant information in your documents to answer this question.",
        sources: []
      });
    }

    // Group matches by source file to ensure diversity
    const bySource = new Map<string, typeof allMatches>();
    allMatches.forEach(match => {
      if (!bySource.has(match.source)) {
        bySource.set(match.source, []);
      }
      bySource.get(match.source)!.push(match);
    });

    // Adaptive context selection based on question complexity and model limits
    // Estimate tokens: ~4 chars per token, chunks are ~1500 tokens each
    // GPT-4 has 10k TPM limit, so we need to be conservative
    // Target: ~5000-6000 tokens for context (leaving room for prompt + response)
    const maxContextTokens = 5000; // Conservative limit
    const avgTokensPerChunk = 1500; // Rough estimate
    const maxChunks = Math.floor(maxContextTokens / avgTokensPerChunk); // ~3-4 chunks
    
    // For simple questions, use fewer chunks. For complex questions, use more
    const questionLength = question.length;
    const isSimpleQuestion = questionLength < 50 && !question.toLowerCase().includes('compare') && 
                            !question.toLowerCase().includes('analyze') && 
                            !question.toLowerCase().includes('all documents');
    
    // Adjust chunk count based on question complexity
    const targetChunks = isSimpleQuestion ? Math.min(5, maxChunks) : Math.min(10, maxChunks);
    
    const diverseContext: typeof allMatches = [];
    const numSources = bySource.size;
    
    // For simple questions: 1-2 chunks per source. For complex: 2-4 chunks per source
    const chunksPerSource = isSimpleQuestion 
      ? Math.max(1, Math.floor(targetChunks / numSources))
      : Math.max(2, Math.floor(targetChunks / numSources));
    
    bySource.forEach((matches, source) => {
      // Take top chunks from each source, prioritizing higher relevance scores
      const sortedMatches = matches.sort((a, b) => (b.score || 0) - (a.score || 0));
      diverseContext.push(...sortedMatches.slice(0, chunksPerSource));
    });

    // If we still need more context and it's a complex question, add more
    if (!isSimpleQuestion && diverseContext.length < targetChunks) {
      // Sort all matches by score and add top ones
      const sortedAllMatches = allMatches.sort((a, b) => (b.score || 0) - (a.score || 0));
      for (const match of sortedAllMatches) {
        if (diverseContext.length >= targetChunks) break;
        // Avoid duplicates
        if (!diverseContext.some(c => c.text === match.text && c.source === match.source)) {
          diverseContext.push(match);
        }
      }
    }
    
    // Final safety: limit to target chunks and sort by relevance
    diverseContext.sort((a, b) => (b.score || 0) - (a.score || 0));
    if (diverseContext.length > targetChunks) {
      diverseContext.splice(targetChunks);
    }

    // Build context text with clear source attribution
    const contextText = diverseContext
      .map((item, idx) => `[${idx + 1}] From ${item.source}:\n${item.text}`)
      .join('\n\n');

    // Build list of unique sources
    const uniqueSources = Array.from(bySource.keys());
    const sourceList = uniqueSources.length > 1 
      ? `You have context from ${uniqueSources.length} different documents: ${uniqueSources.join(', ')}. `
      : '';

    // Construct comprehensive prompt for better answers
    const prompt = `You are an expert research assistant. Analyze the provided context and give a comprehensive, well-structured answer to the question.

${sourceList}
INSTRUCTIONS:
- Provide a detailed, comprehensive answer that synthesizes information from the context
- Use clear structure: introduction, main points, and conclusion
- Always cite your sources using [1], [2], etc. when referencing specific information
- If the question asks about specific aspects, address each one thoroughly
- Include relevant details, examples, and explanations from the context
- If information is missing or unclear, acknowledge it
- Write in a clear, professional tone

CONTEXT FROM DOCUMENTS:
${contextText}

QUESTION: ${question}

Provide a comprehensive answer:`;

    // Get answer from selected provider/model
    // Note: selectedModel already defined above for credit cost calculation
    let completion: any;
    let tokensUsed = 0;
    
    if (provider === 'openai') {
      // Use OpenAI
      const chatApiKey = apiKey || process.env.OPENAI_API_KEY;
      const usingUserKeyForChat = !!apiKey;
      if (usingUserKeyForChat) {
        console.log('[API] Chat completion using user-provided OpenAI key');
      } else {
        console.log('[API] Chat completion using server OpenAI key from env');
      }
      const openaiClient = new OpenAI({ apiKey: chatApiKey });
      const result = await openaiClient.chat.completions.create({
        model: selectedModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      });
      completion = { choices: [{ message: { content: result.choices[0].message.content } }] };
      tokensUsed = result.usage?.total_tokens || 0;
    } else if (provider === 'anthropic' && apiKey) {
      // Use Anthropic
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
          temperature: 0.3,
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
      // Fallback to OpenAI (using BYOK key already initialized)
      const result = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      });
      completion = result;
      tokensUsed = result.usage?.total_tokens || 0;
    }

    const answer = completion.choices[0].message.content;
    const sources = diverseContext.map((item, idx) => ({
      number: idx + 1,
      source: item.source,
      relevance: Math.round(item.score! * 100),
    }));

    // Deduct credits if using credits mode (not BYOK)
    let remainingBalance: number | null = null;
    if (!isUsingBYOK && userId && creditCost > 0) {
      try {
        const deductResult = await deductCredits(userId, creditAction, {
          description: `Asked: "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"`,
          referenceType: 'conversation',
          metadata: { model: selectedModel, tokens: tokensUsed },
        });
        
        if (deductResult.success) {
          remainingBalance = deductResult.balance;
          console.log(`[API] Deducted ${creditCost} credits from user ${userId}, remaining: ${remainingBalance}`);
        } else {
          // This shouldn't happen since we checked balance, but log it
          console.error('[API] Failed to deduct credits:', deductResult.error);
        }
      } catch (deductError) {
        console.error('[API] Error deducting credits:', deductError);
        // Continue anyway - don't fail the request
      }
    }

    // Save conversation and messages (if user is authenticated)
    let savedConversationId = conversationId;
    if (userId) {
      try {
        // Create conversation if it doesn't exist
        if (!savedConversationId) {
          const conversation = await createConversation({
            user_id: userId,
            collection_id: collectionId || null,
            title: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
          });
          savedConversationId = conversation.id;
        }

        // Save user message
        await addMessage(savedConversationId, {
          role: 'user',
          content: question,
          sources: null,
          model_used: null,
          tokens_used: null,
          cost_estimate: null,
        });

        // Save assistant response
        let chatCost = 0;
        if (provider === 'openai') {
          chatCost = estimateOpenAICost('chat', tokensUsed, selectedModel);
        } else if (provider === 'anthropic') {
          chatCost = estimateAnthropicCost(tokensUsed, selectedModel);
        }
        await addMessage(savedConversationId, {
          role: 'assistant',
          content: answer || '',
          sources: sources,
          model_used: selectedModel,
          tokens_used: tokensUsed,
          cost_estimate: chatCost,
        });

        // Log usage
        await logUsage({
          user_id: userId,
          api_key_id: null, // TODO: Link to API key when BYOK is implemented
          provider: provider,
          model: selectedModel,
          operation: 'chat',
          tokens_used: tokensUsed,
          cost_estimate: chatCost,
        });
      } catch (dbError) {
        console.warn('Failed to save conversation:', dbError);
        // Continue even if DB fails
      }
    }

    // Return answer with source attribution and credit info
    return NextResponse.json({
      answer,
      sources,
      conversationId: savedConversationId,
      // Credit usage info (only for credits mode)
      credits: keySource === 'credits' ? {
        used: creditCost,
        remaining: remainingBalance,
      } : undefined,
      // Mode indicator
      mode: keySource,
      teamName: keySource === 'team' ? teamName : undefined,
    });

  } catch (error: any) {
    console.error('Ask error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}