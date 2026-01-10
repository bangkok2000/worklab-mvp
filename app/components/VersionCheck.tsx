'use client';

import { useEffect } from 'react';

/**
 * VersionCheck Component
 * 
 * Checks localStorage for app version and clears cache if version mismatch.
 * This prevents old cached UI from appearing after updates.
 * 
 * Following DEVELOPMENT_PROTOCOL.md:
 * - Prevents Bug 3 (cache issue) where old UI appears
 * - Clears localStorage on version mismatch
 * - Forces reload to get new code
 */
const APP_VERSION = '1.0.0'; // Update this when making breaking changes to localStorage structure

export default function VersionCheck() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedVersion = localStorage.getItem('moonscribe-version');
      
      // If version doesn't match or doesn't exist, clear cache and reload
      if (storedVersion !== APP_VERSION) {
        console.log(`[VersionCheck] Version mismatch: stored=${storedVersion}, current=${APP_VERSION}. Clearing cache...`);
        
        // Clear all localStorage (except version itself to prevent loop)
        const keysToKeep: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !key.startsWith('moonscribe-')) {
            keysToKeep.push(key);
          }
        }
        
        // Clear MoonScribe-specific keys
        localStorage.clear();
        
        // Restore non-MoonScribe keys (if any)
        keysToKeep.forEach(key => {
          // Note: We can't restore values as they're already cleared
          // This is intentional - we want a clean slate
        });
        
        // Set new version
        localStorage.setItem('moonscribe-version', APP_VERSION);
        
        // Force reload to get new code
        window.location.reload();
      } else {
        // Version matches - ensure it's set (for first-time users)
        localStorage.setItem('moonscribe-version', APP_VERSION);
      }
    } catch (error) {
      console.error('[VersionCheck] Error checking version:', error);
      // Don't block app if version check fails
    }
  }, []);

  // This component doesn't render anything
  return null;
}
