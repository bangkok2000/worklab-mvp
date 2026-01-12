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
// Use package.json version + build timestamp for better cache busting
const APP_VERSION = '1.0.1'; // Update this when making breaking changes to localStorage structure or UI
// Only use build timestamp in production - in dev, use a fixed value to prevent data loss
const BUILD_TIMESTAMP = process.env.NEXT_PUBLIC_BUILD_TIME || (process.env.NODE_ENV === 'production' ? new Date().toISOString() : 'dev-build');

export default function VersionCheck() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedVersion = localStorage.getItem('moonscribe-version');
      const storedBuildTime = localStorage.getItem('moonscribe-build-time');
      
      // Check both version and build time for better cache detection
      const versionMismatch = storedVersion !== APP_VERSION;
      // Only check build time in production - in dev, ignore build time to prevent data loss
      const buildTimeMismatch = process.env.NODE_ENV === 'production' && storedBuildTime !== BUILD_TIMESTAMP;
      
      // If version doesn't match (or build time in production), clear cache and reload
      // NOTE: In development, we only clear on version mismatch to preserve user data
      if (versionMismatch || buildTimeMismatch) {
        console.log(`[VersionCheck] Cache mismatch detected:`);
        console.log(`  Version: stored=${storedVersion}, current=${APP_VERSION}`);
        console.log(`  Build: stored=${storedBuildTime}, current=${BUILD_TIMESTAMP}`);
        console.log(`  Clearing cache and reloading...`);
        
        // Clear all MoonScribe localStorage keys
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('moonscribe-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Set new version and build time
        localStorage.setItem('moonscribe-version', APP_VERSION);
        localStorage.setItem('moonscribe-build-time', BUILD_TIMESTAMP);
        
        // Force hard reload to bypass browser cache
        // Using window.location.reload(true) is deprecated, so we use replace
        window.location.replace(window.location.href + '?v=' + Date.now());
      } else {
        // Version matches - ensure it's set (for first-time users)
        localStorage.setItem('moonscribe-version', APP_VERSION);
        localStorage.setItem('moonscribe-build-time', BUILD_TIMESTAMP);
      }
    } catch (error) {
      console.error('[VersionCheck] Error checking version:', error);
      // Don't block app if version check fails
    }
  }, []);

  // This component doesn't render anything
  return null;
}
