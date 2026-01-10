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
      // Normalize filenames for matching (case-insensitive, handle truncation)
      // Pinecone stores full titles, but we might send truncated ones, so use case-insensitive matching
      // IMPORTANT: Use case-insensitive matching by normalizing both sides
      const normalizedSourceFilenames = sourceFilenames.map(f => f.trim().toLowerCase());
      filter = {
        source: { $in: sourceFilenames } // Pinecone filter uses exact match, but we'll also verify after retrieval
      };
      console.log('[API] Filtering by sourceFilenames:', sourceFilenames);
      console.log('[API] Normalized sourceFilenames for verification:', normalizedSourceFilenames);
      console.log('[API] Filter object:', JSON.stringify(filter));
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
    // Normalize source filenames for verification (case-insensitive)
    const normalizeForMatch = (str: string) => str.trim().toLowerCase();
    const normalizedSourceFilenames = sourceFilenames && Array.isArray(sourceFilenames) && sourceFilenames.length > 0
      ? sourceFilenames.map(f => normalizeForMatch(f))
      : [];
    
    const allMatches = searchResults.matches
      .map(match => ({
        text: match.metadata?.text as string,
        source: match.metadata?.source as string,
        url: match.metadata?.url as string | undefined, // Extract URL for web sources
        sourceType: match.metadata?.source_type as string | undefined, // Extract source type
        startTime: match.metadata?.start_time as number | undefined, // Extract start time for audio sources
        endTime: match.metadata?.end_time as number | undefined, // Extract end time for audio sources
        audioId: match.metadata?.audio_id as string | undefined, // Extract audio ID for linking
        score: match.score,
        metadata: match.metadata, // Keep full metadata for reference
      }))
      .filter(item => {
        // Filter out empty text
        if (!item.text || item.text.trim().length < 50) return false;
        
        // If sourceFilenames filter was applied, verify the source matches (case-insensitive)
        if (normalizedSourceFilenames.length > 0) {
          const normalizedSource = normalizeForMatch(item.source);
          const matches = normalizedSourceFilenames.some(filterName => 
            normalizedSource === filterName || 
            normalizedSource.includes(filterName) || 
            filterName.includes(normalizedSource)
          );
          if (!matches) {
            console.log(`[API] Filtered out chunk from source "${item.source}" (not in filtered list: ${sourceFilenames.join(', ')})`);
            return false;
          }
        }
        
        return true;
      });

    if (allMatches.length === 0) {
      return NextResponse.json({ 
        answer: "I couldn't find relevant information in your documents to answer this question.",
        sources: []
      });
    }

    // Normalize source names for deduplication (case-insensitive, trim whitespace)
    const normalizeSourceName = (name: string): string => {
      return name.trim().toLowerCase();
    };
    
    // Group matches by normalized source file to ensure diversity and deduplication
    const bySource = new Map<string, typeof allMatches>();
    const sourceNameMap = new Map<string, string>(); // Maps normalized -> original name
    
    allMatches.forEach(match => {
      const normalized = normalizeSourceName(match.source);
      const originalName = sourceNameMap.get(normalized) || match.source;
      
      // Store original name for display
      if (!sourceNameMap.has(normalized)) {
        sourceNameMap.set(normalized, match.source);
      }
      
      if (!bySource.has(normalized)) {
        bySource.set(normalized, []);
      }
      bySource.get(normalized)!.push(match);
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

    // Helper function to format timestamp (seconds to MM:SS or HH:MM:SS)
    const formatTimestamp = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Build context text with clear source attribution (use original names)
    const contextText = diverseContext
      .map((item, idx) => {
        const normalized = normalizeSourceName(item.source);
        const displayName = sourceNameMap.get(normalized) || item.source;
        // Include URL for web sources so AI can reference it
        const urlInfo = item.url && item.sourceType === 'web' 
          ? ` (Source URL: ${item.url})` 
          : '';
        // Include timestamp for audio sources so AI can reference it
        const timestampInfo = item.sourceType === 'audio' && item.startTime !== undefined
          ? ` (at ${formatTimestamp(item.startTime)})`
          : '';
        return `[${idx + 1}] From ${displayName}${urlInfo}${timestampInfo}:\n${item.text}`;
      })
      .join('\n\n');

    // Build list of unique sources (use original names, deduplicated)
    const uniqueSources = Array.from(new Set(
      Array.from(bySource.keys()).map(normalized => sourceNameMap.get(normalized) || normalized)
    ));
    
    // Detect meta-questions about sources (do this before other question analysis)
    const questionLower = question.toLowerCase();
    const isMetaQuestion = questionLower.includes('where are you getting') || 
                           questionLower.includes('where did you get') ||
                           questionLower.includes('what is your source') ||
                           questionLower.includes('where is this from') ||
                           questionLower.includes('where does this come from') ||
                           (questionLower.includes('what document') && questionLower.includes('from'));
    
    // Detect if question is asking about a specific source type
    const isAskingAboutWebLink = questionLower.includes('web link') || questionLower.includes('url') || 
                                  questionLower.includes('webpage') || questionLower.includes('website') ||
                                  questionLower.includes('article') || questionLower.includes('wikipedia');
    const isAskingAboutDocument = questionLower.includes('document') || questionLower.includes('pdf') || 
                                   questionLower.includes('file') || questionLower.includes('upload');
    
    // Identify source types from the retrieved context and metadata
    const webSources: string[] = [];
    const docSources: string[] = [];
    
    // Check context chunks for source_type metadata to accurately identify web vs document sources
    const sourceTypeMap = new Map<string, 'web' | 'document'>();
    allMatches.forEach(match => {
      const normalized = normalizeSourceName(match.source);
      const originalName = sourceNameMap.get(normalized) || match.source;
      // Check if we've seen this source in metadata
      const matchMetadata = searchResults.matches.find(m => 
        normalizeSourceName(m.metadata?.source as string || '') === normalized
      );
      if (matchMetadata?.metadata?.source_type) {
        sourceTypeMap.set(originalName, matchMetadata.metadata.source_type as 'web' | 'document');
      }
    });
    
    uniqueSources.forEach(source => {
      const sourceLower = source.toLowerCase();
      // Check metadata first, then fallback to heuristics
      if (sourceTypeMap.has(source)) {
        if (sourceTypeMap.get(source) === 'web') {
          webSources.push(source);
        } else {
          docSources.push(source);
        }
      } else if (sourceLower.includes('wikipedia') || sourceLower.includes('http') || 
                 sourceLower.includes('article') || sourceLower.includes('web') ||
                 sourceLower.endsWith('.html') || sourceLower.includes('url')) {
        webSources.push(source);
      } else if (sourceLower.endsWith('.pdf') || sourceLower.includes('document') || 
                 sourceLower.includes('file') || sourceLower.includes('upload')) {
        docSources.push(source);
      } else {
        // Default to document if unclear
        docSources.push(source);
      }
    });
    
    // Build source list with type indicators
    let sourceList = '';
    if (uniqueSources.length > 1) {
      sourceList = `You have context from ${uniqueSources.length} different sources: ${uniqueSources.join(', ')}. `;
      
      // Add explicit guidance if question is about a specific type
      if (isAskingAboutWebLink && webSources.length > 0) {
        sourceList += `IMPORTANT: The question is asking about a web link/URL/article. Focus your answer primarily on the web source(s): ${webSources.join(', ')}. Only mention other sources if directly relevant. `;
      } else if (isAskingAboutDocument && docSources.length > 0) {
        sourceList += `IMPORTANT: The question is asking about a document/PDF/file. Focus your answer primarily on the document source(s): ${docSources.join(', ')}. Only mention other sources if directly relevant. `;
      }
    } else if (uniqueSources.length === 1) {
      sourceList = `You have context from: ${uniqueSources[0]}. `;
    }

    // Construct comprehensive prompt for better answers
    let prompt = '';
    
    if (isMetaQuestion) {
      // Special handling for meta-questions about sources
      prompt = `You are an expert research assistant. The user is asking about WHERE you are getting your information from.

${sourceList}
CRITICAL INSTRUCTIONS:
- You MUST explain that you are getting information ONLY from the documents/sources listed above
- List the specific source(s) you have access to: ${uniqueSources.join(', ')}
- DO NOT make up or infer any information
- Simply state: "I am getting information from the following source(s): [list sources]. All information I provide comes directly from these documents."
- If no sources are available, say "I don't have access to any documents to answer questions."

AVAILABLE SOURCES:
${uniqueSources.map((s, i) => `[${i + 1}] ${s}`).join('\n')}

QUESTION: ${question}

Provide a direct answer about where you are getting information from:`;
    } else {
      // Standard question handling
      prompt = `You are an expert research assistant. Analyze the provided context and give a comprehensive, well-structured answer to the question.

${sourceList}
CRITICAL INSTRUCTIONS:
- You MUST ONLY use information that is explicitly stated in the provided context below
- DO NOT use any information from your training data or general knowledge unless it's also in the provided context
- DO NOT make up, infer, or assume any information that is not directly stated in the context
- DO NOT mix up or confuse information from different sources - each source is clearly labeled
- If the information needed to answer the question is NOT in the provided context, you MUST say "I couldn't find this information in the provided documents" or "This information is not available in the provided context"
- If the question asks about a specific source type (web link, document, etc.), focus your answer ONLY on that source type from the context
- Always cite your sources using [1], [2], etc. when referencing specific information
- For audio sources, the context includes timestamps (e.g., "at 2:34"). When citing audio sources, you may mention the timestamp naturally in your response (e.g., "as mentioned at 2:34" or "around the 5-minute mark")
- If information is missing or unclear in the context, explicitly acknowledge it rather than guessing
- Write in a clear, professional tone

CONTEXT FROM DOCUMENTS (ONLY USE INFORMATION FROM THIS CONTEXT):
${contextText}

QUESTION: ${question}

Provide a comprehensive answer that directly addresses the question. Remember: ONLY use information from the context above. If the answer is not in the context, say so explicitly.`;
    }

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
      // Use system message for stricter control over behavior
      const systemMessage = isMetaQuestion 
        ? `You are a research assistant. When asked about where you get information, you MUST only state the source documents provided. Do not make up or infer anything.`
        : `You are a research assistant. You MUST ONLY use information from the provided context. DO NOT use training data or general knowledge. If information is not in the context, say so explicitly.`;
      
      const result = await openaiClient.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Lower temperature for more deterministic, factual responses
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
          messages: [
            { 
              role: 'system', 
              content: isMetaQuestion 
                ? `You are a research assistant. When asked about where you get information, you MUST only state the source documents provided. Do not make up or infer anything.`
                : `You are a research assistant. You MUST ONLY use information from the provided context. DO NOT use training data or general knowledge. If information is not in the context, say so explicitly.`
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.1, // Lower temperature for more deterministic, factual responses
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
      const systemMessage = isMetaQuestion 
        ? `You are a research assistant. When asked about where you get information, you MUST only state the source documents provided. Do not make up or infer anything.`
        : `You are a research assistant. You MUST ONLY use information from the provided context. DO NOT use training data or general knowledge. If information is not in the context, say so explicitly.`;
      
      const result = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Lower temperature for more deterministic, factual responses
        max_tokens: 2000,
      });
      completion = result;
      tokensUsed = result.usage?.total_tokens || 0;
    }

    const answer = completion.choices[0].message.content;
    // Deduplicate sources by normalizing names, but keep timestamp info for audio
    const seenSources = new Set<string>();
    const sources = diverseContext
      .map((item, idx) => {
        const normalized = normalizeSourceName(item.source);
        const displayName = sourceNameMap.get(normalized) || item.source;
        return {
          number: idx + 1,
          source: displayName,
          relevance: Math.round(item.score! * 100),
          normalized,
          // Include timestamp info for audio sources
          ...(item.sourceType === 'audio' && item.startTime !== undefined && {
            timestamp: item.startTime,
            timestampFormatted: formatTimestamp(item.startTime),
            audioId: item.audioId,
          }),
        };
      })
      .filter((item, idx, arr) => {
        // Only include first occurrence of each normalized source
        if (seenSources.has(item.normalized)) {
          return false;
        }
        seenSources.add(item.normalized);
        return true;
      })
      .map(({ normalized, ...rest }) => rest); // Remove normalized from final output

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