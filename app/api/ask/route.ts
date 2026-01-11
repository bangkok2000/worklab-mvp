import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { createServerClient } from '@/lib/supabase/client';
import { createConversation, addMessage } from '@/lib/supabase/conversations';
import { estimateOpenAICost, estimateAnthropicCost, logUsage } from '@/lib/supabase/usage';
import { expandQuery, expandQueryWithLLM } from '@/lib/utils/query-expansion';
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
    // Use LLM-based expansion for complex queries, simple expansion for short queries
    let expandedQuery: string;
    const isComplexQuery = question.length > 50 || 
                           question.toLowerCase().includes('compare') ||
                           question.toLowerCase().includes('analyze') ||
                           question.toLowerCase().includes('explain') ||
                           question.split(' ').length > 10;
    
    if (isComplexQuery && openaiKey) {
      // Use LLM-based expansion for complex queries
      try {
        expandedQuery = await expandQueryWithLLM(question, openai, selectedModel);
        console.log('[API] Using LLM-based query expansion for complex query');
      } catch (error) {
        console.warn('[API] LLM query expansion failed, using simple expansion:', error);
        expandedQuery = expandQuery(question);
      }
    } else {
      // Use simple keyword expansion for short/simple queries
      expandedQuery = expandQuery(question);
    }
    
    // Embed the expanded question (always use OpenAI for embeddings)
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: expandedQuery,
    });

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // Build filter for specific documents if provided
    // Priority: sourceFilenames (works for all users) > documentIds (authenticated only)
    // NOTE: We don't use Pinecone filter for sourceFilenames because it requires exact match
    // Instead, we retrieve more results and filter post-retrieval (case-insensitive, flexible)
    let filter: any = undefined;
    
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      // Filter by document_id if provided (for authenticated users with UUIDs)
      // This works because document_id is a UUID stored exactly
      filter = {
        document_id: { $in: documentIds }
      };
    } else if (documentIds && typeof documentIds === 'string') {
      // Single document ID
      filter = {
        document_id: { $eq: documentIds }
      };
    }
    // NOTE: We intentionally DON'T filter by sourceFilenames in Pinecone because:
    // 1. Pinecone requires exact match, but filenames might have slight variations
    // 2. We do case-insensitive post-retrieval filtering instead (more flexible)
    // 3. This ensures we get results even if there are minor filename differences

    // Search Pinecone - get enough results but not too many
    // If filtering by sourceFilenames, we'll retrieve more and filter post-retrieval
    const topK = (sourceFilenames && sourceFilenames.length > 0) ? 30 : 15; // Get more if we need to filter
    const searchResults = await getIndex().query({
      vector: questionEmbedding,
      topK: topK,
      includeMetadata: true,
      filter: filter, // Only use filter for documentIds (UUIDs), not sourceFilenames
    });
    
    console.log('[API] Pinecone search results:', searchResults.matches.length, 'matches');
    if (sourceFilenames && sourceFilenames.length > 0) {
      console.log('[API] Will filter by sourceFilenames post-retrieval:', sourceFilenames);
    }

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
        if (!item.text || item.text.trim().length < 50) {
          console.log(`[API] Filtered out chunk: text too short (${item.text?.length || 0} chars)`);
          return false;
        }
        
        // If sourceFilenames filter was applied, verify the source matches (case-insensitive)
        if (normalizedSourceFilenames.length > 0) {
          const normalizedSource = normalizeForMatch(item.source || '');
          const matches = normalizedSourceFilenames.some(filterName => 
            normalizedSource === filterName || 
            normalizedSource.includes(filterName) || 
            filterName.includes(normalizedSource)
          );
          if (!matches) {
            console.log(`[API] Filtered out chunk from source "${item.source}" (normalized: "${normalizedSource}") - not matching any of: ${normalizedSourceFilenames.join(', ')}`);
            return false;
          }
        }
        
        return true;
      });
    
    console.log(`[API] After filtering: ${allMatches.length} matches from ${searchResults.matches.length} total results`);
    if (allMatches.length > 0) {
      console.log(`[API] Sample match sources:`, allMatches.slice(0, 3).map(m => m.source));
    }

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
    
    // Convert question to lowercase for analysis (must be done before using questionLower)
    const questionLower = question.toLowerCase();
    
    // Adjust chunk count based on question complexity
    const targetChunks = isSimpleQuestion ? Math.min(5, maxChunks) : Math.min(10, maxChunks);
    
    const diverseContext: typeof allMatches = [];
    const numSources = bySource.size;
    
    // For relationship/comparison questions, we need more context from each source
    const isRelationshipQuestion = questionLower.includes('relationship') || 
                                   questionLower.includes('related') ||
                                   questionLower.includes('compare') ||
                                   questionLower.includes('connection') ||
                                   (questionLower.includes('are') && questionLower.includes('related'));
    
    // Detect complex questions (must be declared before use in chunksPerSource calculation)
    const isComplexQuestion = questionLower.includes('compare') ||
                              questionLower.includes('contrast') ||
                              questionLower.includes('explain why') ||
                              questionLower.includes('how does') ||
                              questionLower.includes('why does') ||
                              questionLower.includes('what are the differences') ||
                              questionLower.includes('what are the similarities') ||
                              questionLower.includes('analyze the relationship') ||
                              questionLower.includes('evaluate') ||
                              questionLower.includes('discuss');
    
    // For simple questions: 1-2 chunks per source. For complex/relationship: 2-4 chunks per source
    const chunksPerSource = isSimpleQuestion 
      ? Math.max(1, Math.floor(targetChunks / numSources))
      : (isRelationshipQuestion || isComplexQuestion)
      ? Math.max(3, Math.floor(targetChunks / numSources)) // More chunks for relationship questions
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
    // Note: questionLower is already declared above (line ~300)
    const isMetaQuestion = questionLower.includes('where are you getting') || 
                           questionLower.includes('where did you get') ||
                           questionLower.includes('what is your source') ||
                           questionLower.includes('where is this from') ||
                           questionLower.includes('where does this come from') ||
                           (questionLower.includes('what document') && questionLower.includes('from'));
    
    // Detect questions about document metadata (names, counts, lists) - these should ALWAYS be answerable
    const isMetadataQuestion = questionLower.includes('what are the') && (questionLower.includes('document') || questionLower.includes('file') || questionLower.includes('source')) ||
                               questionLower.includes('what documents') ||
                               questionLower.includes('list the document') ||
                               questionLower.includes('name of the document') ||
                               questionLower.includes('names of the document') ||
                               questionLower.includes('how many document') ||
                               questionLower.includes('what files') ||
                               questionLower.includes('what sources') ||
                               (questionLower.includes('what are') && uniqueSources.length > 0 && (questionLower.includes('two') || questionLower.includes('three') || questionLower.includes('four') || questionLower.includes('five') || questionLower.match(/\d+/)));
    
    // Detect synthesis tasks (summarize, analyze, tell me about, etc.)
    // These require the AI to synthesize information from multiple chunks
    const isSynthesisTask = questionLower.includes('summarize') || 
                            questionLower.includes('summary') ||
                            questionLower.includes('summarise') ||
                            questionLower.includes('tell me about') ||
                            questionLower.includes('what can you tell me') ||
                            questionLower.includes('describe') ||
                            questionLower.includes('analyze') ||
                            questionLower.includes('analyse') ||
                            questionLower.includes('overview') ||
                            questionLower.includes('what is this') ||
                            questionLower.includes('what is the document') ||
                            questionLower.includes('what does this document') ||
                            questionLower.includes('what does it say') ||
                            questionLower.includes('what is it about') ||
                            questionLower.includes('what do you know') ||
                            questionLower.includes('what do the documents') ||
                            questionLower.includes('relationship') ||
                            questionLower.includes('related') ||
                            questionLower.includes('compare') ||
                            questionLower.includes('similar') ||
                            questionLower.includes('difference') ||
                            questionLower.includes('connection') ||
                            questionLower.includes('how are') ||
                            questionLower.includes('how do they') ||
                            (questionLower.includes('are') && questionLower.includes('related'));
    
    // Detect complex questions that would benefit from chain-of-thought reasoning
    const isComplexQuestion = questionLower.includes('compare') ||
                              questionLower.includes('contrast') ||
                              questionLower.includes('explain why') ||
                              questionLower.includes('how does') ||
                              questionLower.includes('why does') ||
                              questionLower.includes('what are the differences') ||
                              questionLower.includes('what are the similarities') ||
                              questionLower.includes('analyze the relationship') ||
                              questionLower.includes('evaluate') ||
                              questionLower.includes('discuss') ||
                              (question.length > 100); // Long questions are often complex
    
    // Detect if question is asking about a specific source type
    const isAskingAboutWebLink = questionLower.includes('web link') || questionLower.includes('url') || 
                                  questionLower.includes('webpage') || questionLower.includes('website') ||
                                  questionLower.includes('article') || questionLower.includes('wikipedia');
    const isAskingAboutDocument = questionLower.includes('document') || questionLower.includes('pdf') || 
                                   questionLower.includes('file') || questionLower.includes('upload');
    
    // Identify source types from the retrieved context and metadata
    const webSources: string[] = [];
    const docSources: string[] = [];
    const audioSources: string[] = []; // YouTube, audio files
    const pdfSources: string[] = [];
    
    // Check context chunks for source_type metadata to accurately identify source types
    const sourceTypeMap = new Map<string, 'web' | 'document' | 'audio' | 'pdf'>();
    allMatches.forEach(match => {
      const normalized = normalizeSourceName(match.source);
      const originalName = sourceNameMap.get(normalized) || match.source;
      // Check if we've seen this source in metadata
      const matchMetadata = searchResults.matches.find(m => 
        normalizeSourceName(m.metadata?.source as string || '') === normalized
      );
      if (matchMetadata?.metadata?.source_type) {
        const sourceType = matchMetadata.metadata.source_type as string;
        if (sourceType === 'audio' || sourceType === 'youtube') {
          sourceTypeMap.set(originalName, 'audio');
        } else if (sourceType === 'web') {
          sourceTypeMap.set(originalName, 'web');
        } else if (sourceType === 'pdf' || sourceType === 'document') {
          sourceTypeMap.set(originalName, sourceType === 'pdf' ? 'pdf' : 'document');
        }
      }
    });
    
    uniqueSources.forEach(source => {
      const sourceLower = source.toLowerCase();
      // Check metadata first, then fallback to heuristics
      if (sourceTypeMap.has(source)) {
        const type = sourceTypeMap.get(source)!;
        if (type === 'web') {
          webSources.push(source);
        } else if (type === 'audio') {
          audioSources.push(source);
        } else if (type === 'pdf') {
          pdfSources.push(source);
          docSources.push(source); // PDFs are also documents
        } else {
          docSources.push(source);
        }
      } else if (sourceLower.includes('youtube') || sourceLower.includes('audio') || 
                 sourceLower.includes('.mp3') || sourceLower.includes('.wav') || 
                 sourceLower.includes('.m4a')) {
        audioSources.push(source);
      } else if (sourceLower.includes('wikipedia') || sourceLower.includes('http') || 
                 sourceLower.includes('article') || sourceLower.includes('web') ||
                 sourceLower.endsWith('.html') || sourceLower.includes('url')) {
        webSources.push(source);
      } else if (sourceLower.endsWith('.pdf')) {
        pdfSources.push(source);
        docSources.push(source);
      } else if (sourceLower.includes('document') || sourceLower.includes('file') || 
                 sourceLower.includes('upload')) {
        docSources.push(source);
      } else {
        // Default to document if unclear
        docSources.push(source);
      }
    });
    
    // Determine primary source type for context-aware prompting
    const hasPDFs = pdfSources.length > 0;
    const hasAudio = audioSources.length > 0;
    const hasWeb = webSources.length > 0;
    const primarySourceType = hasPDFs ? 'pdf' : hasAudio ? 'audio' : hasWeb ? 'web' : 'document';
    
    // Build source list with type indicators and context-aware guidance
    let sourceList = '';
    let contextAwareGuidance = '';
    
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
    
    // Add context-aware guidance based on source types
    if (hasPDFs) {
      contextAwareGuidance += `Note: You are analyzing PDF documents. When citing information, reference the source document. If page numbers or sections are mentioned in the context, include them in your citations. `;
    }
    if (hasAudio) {
      contextAwareGuidance += `Note: You are analyzing audio/video content (YouTube, audio files). The context includes timestamps (e.g., "at 2:34"). When citing information, mention the timestamp naturally (e.g., "as mentioned at 2:34" or "around the 5-minute mark"). `;
    }
    if (hasWeb) {
      contextAwareGuidance += `Note: You are analyzing web content. When citing information, you may reference the source URL if provided in the context. `;
    }

    // Construct comprehensive prompt for better answers
    let prompt = '';
    
    if (isMetadataQuestion) {
      // Special handling for questions about document metadata (names, counts, etc.)
      // These questions should ALWAYS be answerable from the source list
      prompt = `You are a research assistant. Answer questions about what documents or sources are available.

Available sources:
${uniqueSources.map((s, i) => `[${i + 1}] ${s}`).join('\n')}

Rules:
- You can ALWAYS answer questions about what documents/sources are available
- List the document names when asked "what are the documents" or similar questions
- You can count how many documents there are
- Be helpful and provide the information requested

Question: ${question}

Answer:`;
    } else if (isMetaQuestion) {
      // Special handling for meta-questions about sources
      prompt = `You are a research assistant. Answer questions about your information sources.

${sourceList}
Rules:
- State that you get information ONLY from the sources listed above
- List the specific sources: ${uniqueSources.join(', ')}
- Do not make up or infer anything

Available sources:
${uniqueSources.map((s, i) => `[${i + 1}] ${s}`).join('\n')}

Question: ${question}

Answer:`;
    } else if (isSynthesisTask) {
      // Special handling for synthesis tasks (summarize, analyze, tell me about, etc.)
      // These tasks REQUIRE the AI to synthesize information from multiple chunks
      const chainOfThought = isComplexQuestion ? `\n\nThink step by step:
1. Identify the main topics and themes in the context
2. Extract key information from different parts
3. Organize the information logically
4. Synthesize into a coherent answer
5. Cite your sources\n` : '';
      
      prompt = `You are a helpful research assistant. Answer the question using information from the provided documents.

${sourceList}${contextAwareGuidance}
Guidelines:
- Synthesize and connect information from different parts of the context to provide a comprehensive answer
- You can make reasonable inferences, connections, and comparisons based on the information in the context
- For questions about relationships, comparisons, or connections: analyze the documents and provide insights based on their content
- Be helpful and provide useful insights - even if the answer requires synthesizing information from multiple sources
- For general questions like "what do you know?" or "tell me about the documents": provide a helpful overview based on the context
- Cite sources using [1], [2], etc. when referencing specific information
- Write in a clear, conversational, and helpful tone
- ALWAYS provide a helpful answer based on the context - analyze what's there and share insights
${chainOfThought}

Context from documents:
${contextText}

Question: ${question}

Answer:`;
    } else {
      // Standard fact-finding questions (specific questions with direct answers)
      const chainOfThought = isComplexQuestion ? `\n\nThink step by step:
1. Identify which parts of the context are relevant to the question
2. Extract and synthesize the information needed
3. Make reasonable connections and inferences based on the context
4. Formulate a clear, helpful answer
5. Cite your sources when referencing specific information\n` : '';
      
      prompt = `You are a helpful research assistant. Answer the question using information from the provided documents.

${sourceList}${contextAwareGuidance}
Guidelines:
- Use information from the context to provide a helpful, insightful answer
- You can make reasonable inferences, connections, and comparisons based on the information provided
- For questions about relationships or comparisons: analyze the documents and provide insights based on their content
- For general questions like "what do you know?": provide a helpful overview based on what's in the context
- Be conversational and helpful - provide useful insights based on the context
- Even if the exact answer isn't explicitly stated, provide helpful insights based on what you can infer from the context
- Cite sources with [1], [2], etc. when referencing specific information
- Write in a clear, natural, and helpful tone
- ALWAYS provide a helpful answer based on the context - analyze what's there and share insights
${chainOfThought}

Context from documents:
${contextText}

Question: ${question}

Answer:`;
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
      const systemMessage = isMetadataQuestion
        ? `You are a helpful research assistant. When asked about what documents are available, list the document names from the sources provided. Always answer these questions - they are about metadata, not content.`
        : isMetaQuestion 
        ? `You are a helpful research assistant. When asked about sources, state the documents provided.`
        : isSynthesisTask
        ? `You are a helpful research assistant. Synthesize information from the context to provide comprehensive, insightful answers. Connect information from different parts, make reasonable inferences, and provide useful insights. Be helpful and conversational. For relationship or comparison questions, analyze the documents and provide insights based on their content. For general questions, provide helpful overviews. ALWAYS provide helpful answers based on the context.`
        : `You are a helpful research assistant. Answer questions using information from the provided context. Be conversational, helpful, and provide useful insights. You can make reasonable inferences, connections, and comparisons. For relationship or comparison questions, analyze the documents and provide insights. Always try to provide helpful answers based on what's in the context - only say you couldn't find information if there's truly nothing relevant at all. Don't make up specific facts, numbers, or details that aren't in the context.`;
      
      // Adjust temperature based on task type
      // Higher temperature for more natural, conversational responses
      // Metadata questions and synthesis tasks benefit from more creativity
      // Increased temperatures to encourage more helpful, less conservative responses
      const temperature = isMetadataQuestion ? 0.4 : (isSynthesisTask ? 0.5 : 0.3);
      
      const result = await openaiClient.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
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
              content: isMetadataQuestion
                ? `You are a research assistant. When asked about what documents are available, list the document names from the sources provided. Always answer these questions - they are about metadata, not content.`
                : isMetaQuestion 
                ? `You are a helpful research assistant. When asked about sources, state the documents provided.`
                : isSynthesisTask
                ? `You are a helpful research assistant. Synthesize information from the context to provide comprehensive answers. Connect information from different parts and make reasonable inferences based on what's provided. Be helpful and insightful.`
                : `You are a helpful research assistant. Answer questions using information from the provided context. Be conversational, helpful, and provide useful insights. You can make reasonable inferences based on the context. Only say you couldn't find information if the context truly has nothing relevant. Don't make up specific facts, numbers, or details that aren't in the context.`
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          temperature: isMetadataQuestion ? 0.4 : (isSynthesisTask ? 0.5 : 0.3),
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
      const systemMessage = isMetadataQuestion
        ? `You are a helpful research assistant. When asked about what documents are available, list the document names from the sources provided. Always answer these questions - they are about metadata, not content.`
        : isMetaQuestion 
        ? `You are a helpful research assistant. When asked about sources, state the documents provided.`
        : isSynthesisTask
        ? `You are a helpful research assistant. Synthesize information from the context to provide comprehensive, insightful answers. Connect information from different parts, make reasonable inferences, and provide useful insights. Be helpful and conversational. For relationship or comparison questions, analyze the documents and provide insights based on their content. For general questions, provide helpful overviews. ALWAYS provide helpful answers based on the context.`
        : `You are a helpful research assistant. Answer questions using information from the provided context. Be conversational, helpful, and provide useful insights. You can make reasonable inferences, connections, and comparisons. For relationship or comparison questions, analyze the documents and provide insights. Always try to provide helpful answers based on what's in the context - only say you couldn't find information if there's truly nothing relevant at all. Don't make up specific facts, numbers, or details that aren't in the context.`;
      
      const temperature = isMetadataQuestion ? 0.4 : (isSynthesisTask ? 0.5 : 0.3);
      
      const result = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
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