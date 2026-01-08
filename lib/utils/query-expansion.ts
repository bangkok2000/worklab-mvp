/**
 * Query Expansion Utilities
 * Expands user queries to improve semantic search recall
 */

/**
 * Simple keyword extraction and expansion
 * Extracts important terms and adds context
 */
export function expandQuery(query: string): string {
  // Remove common stop words for keyword extraction
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'what', 'which', 'who', 'when', 'where',
    'why', 'how', 'about', 'into', 'through', 'during', 'including',
  ]);

  // Extract keywords (words that are not stop words)
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // If query is very short, return as-is
  if (words.length <= 2) {
    return query;
  }

  // For longer queries, add context
  // Strategy: Keep original query + add key terms
  const keyTerms = words.slice(0, 5); // Top 5 keywords
  
  // Build expanded query: original + key terms repeated for emphasis
  const expanded = `${query} ${keyTerms.join(' ')}`;
  
  return expanded.trim();
}

/**
 * LLM-based query expansion (more sophisticated)
 * Uses GPT to rewrite and expand the query
 */
export async function expandQueryWithLLM(
  query: string,
  openaiClient: any,
  model: string = 'gpt-3.5-turbo'
): Promise<string> {
  try {
    const prompt = `Expand and improve this search query to help find relevant information in documents. 
Add synonyms, related terms, and context while keeping the original intent.

Original query: "${query}"

Provide an expanded query that would help find relevant information:`;

    const response = await openaiClient.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 100,
    });

    const expanded = response.choices[0]?.message?.content?.trim() || query;
    
    // Combine original with expanded for best results
    return `${query} ${expanded}`.trim();
  } catch (error) {
    console.warn('Query expansion with LLM failed, using original query:', error);
    return query;
  }
}

/**
 * Multi-query generation
 * Creates multiple query variations for better recall
 */
export function generateQueryVariations(query: string): string[] {
  const variations: string[] = [query]; // Always include original

  // Extract key phrases (2-3 word combinations)
  const words = query.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (phrase.length > 5) {
      variations.push(phrase);
    }
  }

  // Add question form variations
  if (!query.includes('?')) {
    variations.push(`${query}?`);
  }

  // Add "what is" prefix if query is short
  if (query.length < 30 && !query.toLowerCase().startsWith('what')) {
    variations.push(`what is ${query}`);
  }

  return [...new Set(variations)]; // Remove duplicates
}
