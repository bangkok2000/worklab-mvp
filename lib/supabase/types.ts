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

// ============================================
// CREDITS SYSTEM TYPES
// ============================================

export interface Credits {
  id: string;
  user_id: string;
  balance: number;
  lifetime_purchased: number;
  lifetime_used: number;
  free_credits_claimed: boolean;
  created_at: string;
  updated_at: string;
}

export type CreditTransactionType =
  | 'purchase'           // Bought credits via Stripe
  | 'free_starter'       // Free starter credits (one-time)
  | 'bonus'              // Promotional bonus
  | 'refund'             // Refund from failed operation
  | 'ask_gpt35'          // Used for GPT-3.5 question
  | 'ask_gpt4'           // Used for GPT-4 question
  | 'ask_claude'         // Used for Claude question
  | 'upload_document'    // Used for document upload/embedding
  | 'process_youtube'    // Used for YouTube processing
  | 'process_web'        // Used for web page processing
  | 'transcribe_audio'   // Used for audio transcription
  | 'admin_adjustment';  // Manual adjustment by admin

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;              // Positive = add, Negative = deduct
  balance_after: number;
  type: CreditTransactionType;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  currency: string;
  stripe_price_id: string | null;
  description: string | null;
  badge: string | null;        // e.g., "Most Popular", "Best Value"
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCost {
  id: string;
  action: string;
  credits_cost: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper type for credit operations
export interface CreditDeductionResult {
  success: boolean;
  balance: number;
  error?: string;
}

// Credit action identifiers (must match DB)
export type CreditAction =
  | 'ask_gpt35'
  | 'ask_gpt4'
  | 'ask_gpt4o'
  | 'ask_claude'
  | 'upload_document_page'
  | 'process_youtube'
  | 'process_web'
  | 'transcribe_audio_minute'
  | 'export_insight';

// Default credit costs (fallback if DB unavailable)
// Updated for healthy profit margins
export const DEFAULT_CREDIT_COSTS: Record<CreditAction, number> = {
  ask_gpt35: 1,      // ~$0.002 cost, ~75% margin
  ask_gpt4: 10,      // ~$0.04 cost, ~60% margin  
  ask_gpt4o: 5,      // ~$0.02 cost, ~75% margin
  ask_claude: 5,     // ~$0.015 cost, ~70% margin
  upload_document_page: 1,  // ~$0.0001 cost, ~99% margin
  process_youtube: 2,
  process_web: 1,
  transcribe_audio_minute: 3,  // Whisper: ~$0.006/min
  export_insight: 0,
};

