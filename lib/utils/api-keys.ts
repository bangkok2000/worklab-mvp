/**
 * API Key Management Utilities
 * Handles storage and retrieval of encrypted API keys
 */

import { encryptApiKey, decryptApiKey, maskApiKey } from './encryption';

// Re-export maskApiKey for convenience
export { maskApiKey };

export type Provider = 'openai' | 'anthropic' | 'google' | 'ollama';

export interface ApiKeyConfig {
  id: string;
  provider: Provider;
  keyName: string;
  encryptedKey: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

/**
 * Get all stored API keys
 */
export function getStoredApiKeys(userId: string | null = null): ApiKeyConfig[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const key = userId ? `moonscribe-keys-${userId}` : 'moonscribe-keys-anonymous';
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load API keys:', error);
    return [];
  }
}

/**
 * Save API key configuration
 */
export async function saveApiKey(
  provider: Provider,
  apiKey: string,
  keyName: string,
  userId: string | null = null
): Promise<ApiKeyConfig> {
  try {
    // Encrypt the key
    const encryptedKey = await encryptApiKey(apiKey, userId);
    
    // Create config
    const config: ApiKeyConfig = {
      id: Date.now().toString(),
      provider,
      keyName: keyName || `${provider} key`,
      encryptedKey,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Get existing keys
    const existing = getStoredApiKeys(userId);
    
    // Remove any existing key for this provider (or add if new)
    const updated = existing.filter(k => k.provider !== provider || k.id !== config.id);
    updated.push(config);

    // Save
    if (typeof window === 'undefined') {
      throw new Error('localStorage not available');
    }
    const key = userId ? `moonscribe-keys-${userId}` : 'moonscribe-keys-anonymous';
    localStorage.setItem(key, JSON.stringify(updated));

    return config;
  } catch (error) {
    console.error('Failed to save API key:', error);
    throw error;
  }
}

/**
 * Get decrypted API key
 */
export async function getDecryptedApiKey(
  provider: Provider,
  userId: string | null = null
): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const keys = getStoredApiKeys(userId);
    const keyConfig = keys.find(k => k.provider === provider && k.isActive);
    
    if (!keyConfig) return null;
    
    return await decryptApiKey(keyConfig.encryptedKey, userId);
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    return null;
  }
}

/**
 * Delete API key
 */
export function deleteApiKey(keyId: string, userId: string | null = null): void {
  if (typeof window === 'undefined') return;
  
  const keys = getStoredApiKeys(userId);
  const updated = keys.filter(k => k.id !== keyId);
  
  const key = userId ? `moonscribe-keys-${userId}` : 'moonscribe-keys-anonymous';
  localStorage.setItem(key, JSON.stringify(updated));
}

/**
 * Toggle API key active status
 */
export function toggleApiKey(keyId: string, userId: string | null = null): void {
  if (typeof window === 'undefined') return;
  
  const keys = getStoredApiKeys(userId);
  const updated = keys.map(k => 
    k.id === keyId ? { ...k, isActive: !k.isActive } : k
  );
  
  const key = userId ? `moonscribe-keys-${userId}` : 'moonscribe-keys-anonymous';
  localStorage.setItem(key, JSON.stringify(updated));
}

/**
 * Validate API key format (basic validation)
 */
export function validateApiKey(provider: Provider, key: string): { valid: boolean; error?: string } {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: 'API key cannot be empty' };
  }

  switch (provider) {
    case 'openai':
      if (!key.startsWith('sk-')) {
        return { valid: false, error: 'OpenAI keys should start with "sk-"' };
      }
      break;
    case 'anthropic':
      if (!key.startsWith('sk-ant-')) {
        return { valid: false, error: 'Anthropic keys should start with "sk-ant-"' };
      }
      break;
    case 'google':
      // Google API keys can have various formats
      if (key.length < 20) {
        return { valid: false, error: 'Google API key seems too short' };
      }
      break;
    case 'ollama':
      // Ollama doesn't require keys, but URL validation
      if (!key.startsWith('http')) {
        return { valid: false, error: 'Ollama URL should start with http:// or https://' };
      }
      break;
  }

  return { valid: true };
}

/**
 * Test API key by making a simple request
 */
export async function testApiKey(
  provider: Provider,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'openai':
        const openaiRes = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        if (!openaiRes.ok) {
          return { success: false, error: 'Invalid OpenAI API key' };
        }
        break;

      case 'anthropic':
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }],
          }),
        });
        if (!anthropicRes.ok) {
          return { success: false, error: 'Invalid Anthropic API key' };
        }
        break;

      case 'google':
        // Google API testing is more complex, skip for now
        return { success: true };

      case 'ollama':
        // Test Ollama connection
        const ollamaRes = await fetch(`${apiKey}/api/tags`);
        if (!ollamaRes.ok) {
          return { success: false, error: 'Cannot connect to Ollama server' };
        }
        break;
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to test API key' };
  }
}
