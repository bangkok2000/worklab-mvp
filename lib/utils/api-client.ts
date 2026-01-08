/**
 * API Client Utilities
 * Creates OpenAI/Anthropic clients using user-provided API keys
 */

import { OpenAI } from 'openai';
import { getDecryptedApiKey, type Provider } from './api-keys';

/**
 * Get OpenAI client with user's API key
 */
export async function getOpenAIClient(userId: string | null = null): Promise<OpenAI> {
  const apiKey = await getDecryptedApiKey('openai', userId);
  
  if (!apiKey) {
    // Fallback to server key if no user key
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  
  return new OpenAI({ apiKey });
}

/**
 * Get Anthropic client (when Anthropic SDK is available)
 */
export async function getAnthropicClient(userId: string | null = null): Promise<any> {
  const apiKey = await getDecryptedApiKey('anthropic', userId);
  
  if (!apiKey) {
    throw new Error('No Anthropic API key found. Please add one in Settings.');
  }
  
  // Note: Anthropic SDK import would go here
  // For now, we'll use fetch directly
  return { apiKey };
}

/**
 * Make a chat completion request with provider selection
 */
export async function chatCompletion(
  provider: Provider,
  model: string,
  messages: any[],
  options: any = {},
  userId: string | null = null
): Promise<any> {
  switch (provider) {
    case 'openai':
      const openai = await getOpenAIClient(userId);
      return openai.chat.completions.create({
        model,
        messages,
        ...options,
      });
    
    case 'anthropic':
      const anthropic = await getAnthropicClient(userId);
      // Use fetch for Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropic.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: options.max_tokens || 1000,
          temperature: options.temperature || 0.3,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API error');
      }
      
      return response.json();
    
    case 'google':
      // Google Gemini implementation
      throw new Error('Google provider not yet implemented');
    
    case 'ollama':
      // Ollama local implementation
      const ollamaUrl = await getDecryptedApiKey('ollama', userId);
      if (!ollamaUrl) {
        throw new Error('No Ollama URL configured');
      }
      
      const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
      });
      
      if (!ollamaResponse.ok) {
        throw new Error('Ollama API error');
      }
      
      return ollamaResponse.json();
    
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Make an embedding request
 */
export async function createEmbedding(
  provider: Provider,
  model: string,
  input: string | string[],
  userId: string | null = null
): Promise<any> {
  // For now, only OpenAI supports embeddings
  if (provider !== 'openai') {
    throw new Error('Embeddings only supported for OpenAI');
  }
  
  const openai = await getOpenAIClient(userId);
  return openai.embeddings.create({
    model: model || 'text-embedding-3-large',
    input,
  });
}
