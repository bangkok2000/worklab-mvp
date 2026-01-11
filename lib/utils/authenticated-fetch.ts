/**
 * Authenticated Fetch Utility
 * 
 * Wrapper around fetch that automatically includes Authorization header
 * to prevent the recurring "Please sign in to use credits" error.
 * 
 * USE THIS for ALL internal API calls (/api/*) instead of raw fetch().
 */

import { Session } from '@supabase/supabase-js';

interface AuthenticatedFetchOptions extends RequestInit {
  session?: Session | null;
}

/**
 * Make an authenticated fetch request to internal API routes
 * Automatically includes Authorization header if session is provided
 * 
 * @param url - API endpoint (e.g., '/api/web', '/api/ask')
 * @param options - Fetch options + optional session
 * @returns Promise<Response>
 * 
 * @example
 * ```ts
 * const { session } = useAuth();
 * const response = await authenticatedFetch('/api/web', {
 *   method: 'POST',
 *   session,
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ url: 'https://example.com' }),
 * });
 * ```
 */
export async function authenticatedFetch(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { session, ...fetchOptions } = options;
  
  // Build headers object
  const headers = new Headers(fetchOptions.headers);
  
  // Automatically add Authorization header if session exists
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  
  // Merge with existing headers
  const finalOptions: RequestInit = {
    ...fetchOptions,
    headers,
  };
  
  return fetch(url, finalOptions);
}

/**
 * Helper to get authenticated fetch headers
 * Use this when you need to manually construct headers (e.g., FormData)
 * 
 * @param session - Supabase session
 * @returns Headers object with Authorization if session exists
 * 
 * @example
 * ```ts
 * const { session } = useAuth();
 * const formData = new FormData();
 * formData.append('file', file);
 * 
 * const response = await fetch('/api/upload', {
 *   method: 'POST',
 *   headers: getAuthenticatedHeaders(session),
 *   body: formData,
 * });
 * ```
 */
export function getAuthenticatedHeaders(session?: Session | null): HeadersInit {
  const headers: HeadersInit = {};
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  return headers;
}
