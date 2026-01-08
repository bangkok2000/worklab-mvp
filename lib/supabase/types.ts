// Database types for MoonScribe
// These should match your Supabase schema

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  collection_id: string | null;
  filename: string;
  original_filename: string;
  file_size: number | null;
  file_type: string | null;
  chunk_count: number;
  status: 'processing' | 'ready' | 'error';
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  collection_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: SourceCitation[] | null;
  model_used: string | null;
  tokens_used: number | null;
  cost_estimate: number | null;
  created_at: string;
}

export interface SourceCitation {
  number: number;
  source: string;
  relevance: number;
  page?: number;
  excerpt?: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  provider: 'openai' | 'anthropic' | 'google' | 'ollama';
  key_name: string | null;
  encrypted_key: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  api_key_id: string | null;
  provider: string;
  model: string | null;
  operation: 'embedding' | 'chat' | 'summary' | 'flashcard' | 'quiz' | 'mindmap';
  tokens_used: number | null;
  cost_estimate: number | null;
  created_at: string;
}

