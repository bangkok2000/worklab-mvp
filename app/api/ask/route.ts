import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { createServerClient } from '@/lib/supabase/client';
import { createConversation, addMessage } from '@/lib/supabase/conversations';
import { estimateOpenAICost, logUsage } from '@/lib/supabase/usage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.index(process.env.PINECONE_INDEX!);

export async function POST(req: NextRequest) {
  try {
    const { question, conversationId, collectionId, documentIds, sourceFilenames } = await req.json();

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

    // Embed the question
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: question,
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

    // Search Pinecone - get more results for better context (20-25 chunks)
    const searchResults = await index.query({
      vector: questionEmbedding,
      topK: 25, // Increased from 15 to get 15-20 chunks after filtering
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

    // Take more chunks from each source for comprehensive answers
    // For single document: use up to 15-20 chunks
    // For multiple documents: use 5-10 chunks per document
    const diverseContext: typeof allMatches = [];
    const numSources = bySource.size;
    const chunksPerSource = numSources === 1 ? 20 : Math.max(5, Math.floor(20 / numSources));
    
    bySource.forEach((matches, source) => {
      // Take top chunks from each source, prioritizing higher relevance scores
      const sortedMatches = matches.sort((a, b) => (b.score || 0) - (a.score || 0));
      diverseContext.push(...sortedMatches.slice(0, chunksPerSource));
    });

    // If we still need more context, add remaining high-scoring chunks
    // Target 15-20 chunks total for comprehensive answers
    const targetChunks = 20;
    if (diverseContext.length < targetChunks) {
      // Sort all matches by score and add top ones
      const sortedAllMatches = allMatches.sort((a, b) => (b.score || 0) - (a.score || 0));
      for (const match of sortedAllMatches) {
        if (diverseContext.length >= targetChunks) break;
        // Avoid duplicates
        if (!diverseContext.some(c => c.text === match.text && c.source === match.source)) {
          diverseContext.push(match);
        }
      }
    } else {
      // If we have too many, limit to top 20 by score
      diverseContext.sort((a, b) => (b.score || 0) - (a.score || 0));
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

    // Get answer from GPT with more tokens for comprehensive responses
    const model = 'gpt-3.5-turbo';
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000, // Increased from 1000 for more comprehensive answers
    });

    const answer = completion.choices[0].message.content;
    const tokensUsed = completion.usage?.total_tokens || 0;
    const sources = diverseContext.map((item, idx) => ({
      number: idx + 1,
      source: item.source,
      relevance: Math.round(item.score! * 100),
    }));

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
        const chatCost = estimateOpenAICost('chat', tokensUsed, model);
        await addMessage(savedConversationId, {
          role: 'assistant',
          content: answer || '',
          sources: sources,
          model_used: model,
          tokens_used: tokensUsed,
          cost_estimate: chatCost,
        });

        // Log usage
        await logUsage({
          user_id: userId,
          api_key_id: null, // TODO: Link to API key when BYOK is implemented
          provider: 'openai',
          model: model,
          operation: 'chat',
          tokens_used: tokensUsed,
          cost_estimate: chatCost,
        });
      } catch (dbError) {
        console.warn('Failed to save conversation:', dbError);
        // Continue even if DB fails
      }
    }

    // Return answer with source attribution
    return NextResponse.json({
      answer,
      sources,
      conversationId: savedConversationId,
    });

  } catch (error: any) {
    console.error('Ask error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}