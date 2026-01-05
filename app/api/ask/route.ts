import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.index(process.env.PINECONE_INDEX!);

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    // Embed the question
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: question,
    });

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // Search Pinecone - get more results to ensure diversity
    const searchResults = await index.query({
      vector: questionEmbedding,
      topK: 15, // Get more to ensure multiple files are represented
      includeMetadata: true,
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

    // Take top 3 chunks from each unique source (ensures all files represented)
    const diverseContext: typeof allMatches = [];
    bySource.forEach((matches, source) => {
      diverseContext.push(...matches.slice(0, 3));
    });

    // If we still need more context, add remaining high-scoring chunks
    if (diverseContext.length < 10) {
      allMatches.forEach(match => {
        if (diverseContext.length < 10 && !diverseContext.includes(match)) {
          diverseContext.push(match);
        }
      });
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

    // Construct prompt with emphasis on multi-document synthesis
    const prompt = `You are a helpful research assistant. Answer the question based on the provided context from multiple documents. Always cite your sources using [1], [2], etc.

${sourceList}IMPORTANT: If the question asks about "these files", "all documents", or "both files", make sure to synthesize information from ALL the different source documents mentioned above. Draw insights from each unique document.

CONTEXT:
${contextText}

QUESTION: ${question}

ANSWER (with citations from multiple documents when relevant):`;

    // Get answer from GPT
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const answer = completion.choices[0].message.content;

    // Return answer with source attribution
    return NextResponse.json({
      answer,
      sources: diverseContext.map((item, idx) => ({
        number: idx + 1,
        source: item.source,
        relevance: Math.round(item.score! * 100),
      })),
    });

  } catch (error: any) {
    console.error('Ask error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}