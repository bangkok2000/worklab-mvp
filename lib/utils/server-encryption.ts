/**
 * Server-side encryption utilities for team API keys
 * Uses AES-256-GCM for strong encryption
 * 
 * IMPORTANT: Set ENCRYPTION_SECRET in environment variables
 * Generate with: openssl rand -base64 32
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * Must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is not set');
  }
  
  // If base64 encoded, decode it
  // Otherwise, create a key from the secret using SHA-256
  try {
    const decoded = Buffer.from(secret, 'base64');
    if (decoded.length === 32) {
      return decoded;
    }
  } catch {
    // Not base64, hash it
  }
  
  // Hash the secret to get exactly 32 bytes
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt an API key for storage in database
 * Returns: base64 encoded string containing IV + encrypted data + auth tag
 */
export function encryptApiKey(apiKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  // Combine: IV (16 bytes) + encrypted data + auth tag (16 bytes)
  const combined = Buffer.concat([iv, encrypted, authTag]);
  
  return combined.toString('base64');
}

/**
 * Decrypt an API key from database
 * Input: base64 encoded string from encryptApiKey()
 */
export function decryptApiKey(encryptedData: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Extract parts
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

/**
 * Generate a unique team code
 * Format: MOON-XXXX-XXXX (no confusing characters)
 */
export function generateTeamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O, 1/I/L
  let code = 'MOON-';
  
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

/**
 * Validate that an API key looks valid (basic check)
 */
export function validateApiKeyFormat(apiKey: string, provider: string = 'openai'): boolean {
  if (!apiKey || typeof apiKey !== 'string') return false;
  
  switch (provider) {
    case 'openai':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    case 'anthropic':
      return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
    default:
      return apiKey.length > 10;
  }
}
