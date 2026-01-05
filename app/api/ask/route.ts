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

    // Search Pinecone for relevant chunks
    const searchResults = await index.query({
      vector: questionEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    // Extract context from results
    const context = searchResults.matches
      .map(match => ({
        text: match.metadata?.text as string,
        source: match.metadata?.source as string,
        score: match.score,
      }))
      .filter(item => item.text);

    if (context.length === 0) {
      return NextResponse.json({ 
        answer: "I couldn't find relevant information in your documents to answer this question.",
        sources: []
      });
    }

    // Build prompt with context
    const contextText = context
      .map((item, idx) => `[${idx + 1}] From ${item.source}:\n${item.text}`)
      .join('\n\n');

    const prompt = `You are a helpful research assistant. Answer the question based ONLY on the provided context. Always cite your sources using [1], [2], etc.

CONTEXT:
${contextText}

QUESTION: ${question}

ANSWER (with citations):`;

    // Get answer from GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const answer = completion.choices[0].message.content;

    return NextResponse.json({
      answer,
      sources: context.map((item, idx) => ({
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