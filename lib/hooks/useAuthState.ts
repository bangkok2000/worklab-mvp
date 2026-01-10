'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

/**
 * Unified Auth State Hook
 * 
 * Combines auth loading and BYOK checking into a single coordinated state.
 * Prevents race conditions and UI flicker during state transitions.
 * 
 * Following DEVELOPMENT_PROTOCOL.md:
 * - Coordinates multiple loading states (auth + BYOK)
 * - Adds debouncing to prevent rapid state changes
 * - Returns unified loading and ready states
 */

// Check if user has an active BYOK key
function hasActiveBYOKKey(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Check both possible storage keys (anonymous and user-specific)
    const anonKeys = localStorage.getItem('moonscribe-keys-anonymous');
    if (anonKeys) {
      const keys = JSON.parse(anonKeys);
      if (keys.some((k: { provider: string; isActive: boolean }) => 
        k.provider === 'openai' && k.isActive
      )) {
        return true;
      }
    }
    
    // Also check for any user-specific keys (moonscribe-keys-*)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('moonscribe-keys-') && key !== 'moonscribe-keys-anonymous') {
        const userKeys = localStorage.getItem(key);
        if (userKeys) {
          const keys = JSON.parse(userKeys);
          if (keys.some((k: { provider: string; isActive: boolean }) => 
            k.provider === 'openai' && k.isActive
          )) {
            return true;
          }
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return false;
}

export interface AuthState {
  user: ReturnType<typeof useAuth>['user'];
  loading: boolean; // True if auth OR BYOK is loading
  hasByok: boolean;
  isReady: boolean; // True when both auth and BYOK checks are complete
}

/**
 * Unified hook that coordinates auth and BYOK state
 * Returns loading state that's true if EITHER auth or BYOK is loading
 */
export function useAuthState(): AuthState {
  const { user, loading: authLoading } = useAuth();
  const [byokLoading, setByokLoading] = useState(true);
  const [hasByok, setHasByok] = useState(false);

  useEffect(() => {
    // If auth is loading, BYOK check should also be loading
    if (authLoading) {
      setByokLoading(true);
      return;
    }

    // Check BYOK asynchronously with small delay to prevent flicker
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const checkByok = async () => {
      setByokLoading(true);
      
      // Small delay to prevent flicker during rapid state changes
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (!isMounted) return;

      if (typeof window !== 'undefined') {
        const hasActive = hasActiveBYOKKey();
        setHasByok(hasActive);
      }
      setByokLoading(false);
    };

    checkByok();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [authLoading, user]);

  // Listen for API key changes (when user adds/removes BYOK key)
  useEffect(() => {
    if (authLoading) return;

    let timeoutId: NodeJS.Timeout;

    const handleApiKeyChange = () => {
      // Debounce the check
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const hasActive = hasActiveBYOKKey();
        setHasByok(hasActive);
      }, 100);
    };

    window.addEventListener('storage', handleApiKeyChange);
    window.addEventListener('moonscribe-api-keys-changed', handleApiKeyChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('storage', handleApiKeyChange);
      window.removeEventListener('moonscribe-api-keys-changed', handleApiKeyChange);
    };
  }, [authLoading]);

  return {
    user,
    loading: authLoading || byokLoading,
    hasByok,
    isReady: !authLoading && !byokLoading,
  };
}
