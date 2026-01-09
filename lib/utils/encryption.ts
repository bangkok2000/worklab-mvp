/**
 * Client-side encryption utilities for API keys
 * Uses Web Crypto API for AES-GCM encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Generate a key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a user-specific encryption key
 * Uses a combination of user ID and a master secret
 */
function getUserKey(userId: string | null): string {
  // For anonymous users, use a session-based key
  if (!userId) {
    if (typeof window === 'undefined') {
      // SSR fallback - use a fixed key (not secure, but prevents errors)
      return 'moonscribe-ssr-fallback';
    }
    // Generate a session key and store it
    let sessionKey = sessionStorage.getItem('moonscribe-session-key');
    if (!sessionKey) {
      sessionKey = crypto.randomUUID();
      sessionStorage.setItem('moonscribe-session-key', sessionKey);
    }
    return sessionKey;
  }
  
  // For authenticated users, use user ID + app secret
  // In production, this should be more secure
  return `moonscribe-${userId}`;
}

/**
 * Encrypt an API key
 */
export async function encryptApiKey(
  apiKey: string,
  userId: string | null = null
): Promise<string> {
  try {
    const password = getUserKey(userId);
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);

    // Generate salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive key
    const key = await deriveKey(password, salt);

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv: iv },
      key,
      data
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt API key');
  }
}

/**
 * Decrypt an API key
 */
export async function decryptApiKey(
  encryptedKey: string,
  userId: string | null = null
): Promise<string> {
  try {
    const password = getUserKey(userId);
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));

    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 16 + IV_LENGTH);
    const encrypted = combined.slice(16 + IV_LENGTH);

    // Derive key
    const key = await deriveKey(password, salt);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt API key');
  }
}

/**
 * Mask API key for display (shows first 4 and last 4 characters)
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}
