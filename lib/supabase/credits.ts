import { getSupabase, createServerClient } from './client';
import type { 
  Credits, 
  CreditTransaction, 
  CreditPackage, 
  CreditCost,
  CreditAction,
  CreditDeductionResult,
  DEFAULT_CREDIT_COSTS 
} from './types';

// ============================================
// BALANCE OPERATIONS
// ============================================

/**
 * Get user's current credit balance
 * @param supabaseClient Optional Supabase client (for server-side usage with auth context)
 */
export async function getCredits(userId: string, supabaseClient?: any): Promise<Credits | null> {
  // Use provided client (server-side with auth) or get default client (client-side)
  const supabase = supabaseClient || getSupabase();
  
  const { data, error } = await supabase
    .from('credits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching credits:', error);
    return null;
  }

  return data as Credits;
}

/**
 * Get user's credit balance (just the number)
 * @param supabaseClient Optional Supabase client (for server-side usage with auth context)
 */
export async function getBalance(userId: string, supabaseClient?: any): Promise<number> {
  const credits = await getCredits(userId, supabaseClient);
  return credits?.balance ?? 0;
}

/**
 * Check if user has sufficient credits for an action
 */
export async function hasEnoughCredits(
  userId: string, 
  requiredCredits: number
): Promise<boolean> {
  const balance = await getBalance(userId);
  return balance >= requiredCredits;
}

// ============================================
// CREDIT COSTS
// ============================================

let cachedCreditCosts: Record<string, number> | null = null;

/**
 * Get all credit costs from database (with caching)
 */
export async function getCreditCosts(): Promise<Record<string, number>> {
  if (cachedCreditCosts) {
    return cachedCreditCosts;
  }

  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('credit_costs')
    .select('action, credits_cost')
    .eq('is_active', true);

  if (error || !data) {
    console.error('Error fetching credit costs, using defaults:', error);
    // Return default costs as fallback (updated for profit margins)
    return {
      ask_gpt35: 1,       // ~75% margin
      ask_gpt4: 10,       // ~60% margin
      ask_gpt4o: 5,       // ~75% margin
      ask_claude: 5,      // ~70% margin
      upload_document_page: 1,  // ~99% margin
      process_youtube: 2,
      process_web: 1,
      transcribe_audio_minute: 3,
      export_insight: 0,
    };
  }

  // Convert to lookup object
  cachedCreditCosts = {};
  for (const cost of data) {
    cachedCreditCosts[cost.action] = cost.credits_cost;
  }

  return cachedCreditCosts;
}

/**
 * Get credit cost for a specific action
 */
export async function getCreditCost(action: CreditAction): Promise<number> {
  const costs = await getCreditCosts();
  return costs[action] ?? 0;
}

/**
 * Clear cached credit costs (call if costs are updated)
 */
export function clearCreditCostsCache(): void {
  cachedCreditCosts = null;
}

// ============================================
// CREDIT PACKAGES
// ============================================

/**
 * Get all available credit packages
 */
export async function getCreditPackages(): Promise<CreditPackage[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('credit_packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching credit packages:', error);
    return [];
  }

  return data as CreditPackage[];
}

// ============================================
// CREDIT TRANSACTIONS
// ============================================

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 50
): Promise<CreditTransaction[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data as CreditTransaction[];
}

// ============================================
// CLAIM FREE CREDITS
// ============================================

/**
 * Claim free starter credits (one-time only)
 */
export async function claimFreeStarterCredits(userId: string): Promise<{
  success: boolean;
  credits: number;
  error?: string;
}> {
  const supabase = getSupabase();
  
  // Call the database function
  const { data, error } = await supabase
    .rpc('claim_free_starter_credits', { p_user_id: userId });

  if (error) {
    console.error('Error claiming free credits:', error);
    return { success: false, credits: 0, error: error.message };
  }

  if (data === false) {
    return { success: false, credits: 0, error: 'Free credits already claimed' };
  }

  // Get updated balance
  const balance = await getBalance(userId);
  
  return { success: true, credits: balance };
}

// ============================================
// DEDUCT CREDITS (for API usage)
// ============================================

/**
 * Deduct credits for an action
 * Call this from API routes when user performs credit-consuming actions
 */
export async function deductCredits(
  userId: string,
  action: CreditAction,
  options?: {
    description?: string;
    referenceId?: string;
    referenceType?: string;
    metadata?: Record<string, any>;
  }
): Promise<CreditDeductionResult> {
  const supabase = getSupabase();
  
  // Get cost for this action
  const cost = await getCreditCost(action);
  
  if (cost === 0) {
    // Free action, no deduction needed
    const balance = await getBalance(userId);
    return { success: true, balance };
  }

  // Call the database function to deduct credits atomically
  const { data, error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: cost,
    p_type: action,
    p_description: options?.description || null,
    p_reference_id: options?.referenceId || null,
    p_reference_type: options?.referenceType || null,
    p_metadata: options?.metadata || null,
  });

  if (error) {
    console.error('Error deducting credits:', error);
    return { success: false, balance: 0, error: error.message };
  }

  if (data === false) {
    return { success: false, balance: 0, error: 'Insufficient credits' };
  }

  // Get updated balance
  const balance = await getBalance(userId);
  
  return { success: true, balance };
}

// ============================================
// ADD CREDITS (for purchases)
// ============================================

/**
 * Add credits after successful purchase
 * Call this from Stripe webhook handler
 */
export async function addCredits(
  userId: string,
  amount: number,
  options: {
    stripePaymentId: string;
    packageName?: string;
  }
): Promise<{ success: boolean; balance: number; error?: string }> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_type: 'purchase',
    p_description: options.packageName 
      ? `Purchased ${options.packageName} package` 
      : `Purchased ${amount} credits`,
    p_reference_id: options.stripePaymentId,
    p_metadata: { package_name: options.packageName },
  });

  if (error) {
    console.error('Error adding credits:', error);
    return { success: false, balance: 0, error: error.message };
  }

  return { success: true, balance: data as number };
}

// ============================================
// USAGE MODE CHECK
// ============================================

/**
 * Check if user is in BYOK mode (has their own API key)
 * BYOK users don't consume credits
 */
export async function isUserBYOK(userId: string): Promise<boolean> {
  // Check if user has an active API key stored
  if (typeof window === 'undefined') {
    // Server-side - check via API or session
    return false;
  }
  
  // Client-side - check localStorage for stored API keys
  try {
    const stored = localStorage.getItem(`moonscribe-keys-${userId}`) || 
                   localStorage.getItem('moonscribe-keys-anonymous');
    if (!stored) return false;
    
    const keys = JSON.parse(stored);
    return Array.isArray(keys) && keys.some((k: any) => k.isActive);
  } catch {
    return false;
  }
}

/**
 * Determine if an action should use credits or BYOK
 * Returns true if credits should be deducted
 */
export async function shouldUseCredits(userId: string | null): Promise<boolean> {
  if (!userId) {
    // Guest users can't use credits (they need BYOK)
    return false;
  }
  
  // If user has BYOK keys, don't use credits
  const isBYOK = await isUserBYOK(userId);
  return !isBYOK;
}
