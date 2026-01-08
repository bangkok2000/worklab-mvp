import { supabase } from './client';
import type { UsageLog } from './types';

/**
 * Log API usage
 */
export async function logUsage(
  usage: Omit<UsageLog, 'id' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('usage_logs')
    .insert(usage)
    .select()
    .single();

  if (error) throw error;
  return data as UsageLog;
}

/**
 * Get usage statistics for current month
 */
export async function getMonthlyUsage() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('usage_logs')
    .select('*')
    .gte('created_at', startOfMonth.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as UsageLog[];
}

/**
 * Get usage summary by provider
 */
export async function getUsageByProvider() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('usage_logs')
    .select('provider, model, operation, tokens_used, cost_estimate')
    .gte('created_at', startOfMonth.toISOString());

  if (error) throw error;

  // Group by provider
  const summary = (data as UsageLog[]).reduce((acc, log) => {
    if (!acc[log.provider]) {
      acc[log.provider] = {
        provider: log.provider,
        totalTokens: 0,
        totalCost: 0,
        operationCount: 0,
      };
    }
    acc[log.provider].totalTokens += log.tokens_used || 0;
    acc[log.provider].totalCost += log.cost_estimate || 0;
    acc[log.provider].operationCount += 1;
    return acc;
  }, {} as Record<string, any>);

  return Object.values(summary);
}

/**
 * Calculate cost estimate for OpenAI operations
 */
export function estimateOpenAICost(
  operation: 'embedding' | 'chat',
  tokens: number,
  model?: string
): number {
  // Pricing as of 2024 (update as needed)
  const pricing: Record<string, { input: number; output: number }> = {
    'text-embedding-3-large': { input: 0.00013 / 1000, output: 0 },
    'gpt-3.5-turbo': { input: 0.0005 / 1000, output: 0.0015 / 1000 },
    'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
  };

  if (operation === 'embedding') {
    const rate = pricing['text-embedding-3-large']?.input || 0;
    return tokens * rate;
  }

  // For chat, assume 80% input, 20% output (rough estimate)
  const modelKey = model || 'gpt-3.5-turbo';
  const rates = pricing[modelKey] || pricing['gpt-3.5-turbo'];
  const inputTokens = Math.floor(tokens * 0.8);
  const outputTokens = Math.floor(tokens * 0.2);
  return inputTokens * rates.input + outputTokens * rates.output;
}

/**
 * Calculate cost estimate for Anthropic operations
 */
export function estimateAnthropicCost(
  tokens: number,
  model: string = 'claude-3-sonnet-20240229'
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-3-opus-20240229': { input: 0.015 / 1000, output: 0.075 / 1000 },
    'claude-3-sonnet-20240229': { input: 0.003 / 1000, output: 0.015 / 1000 },
    'claude-3-haiku-20240307': { input: 0.00025 / 1000, output: 0.00125 / 1000 },
  };

  const rates = pricing[model] || pricing['claude-3-sonnet-20240229'];
  // Assume 80% input, 20% output
  const inputTokens = Math.floor(tokens * 0.8);
  const outputTokens = Math.floor(tokens * 0.2);
  return inputTokens * rates.input + outputTokens * rates.output;
}

