/**
 * Guest Usage Limits
 * 
 * Tracks guest user actions and enforces free trial limits.
 * After limit is reached, users must sign in to continue.
 */

const GUEST_USAGE_KEY = 'moonscribe_guest_usage';
const GUEST_LIMIT = 5; // Free queries for guests

export interface GuestUsage {
  queriesUsed: number;
  documentsUploaded: number;
  firstUsedAt: string;
  lastUsedAt: string;
}

/**
 * Get current guest usage from localStorage
 */
export function getGuestUsage(): GuestUsage {
  if (typeof window === 'undefined') {
    return { queriesUsed: 0, documentsUploaded: 0, firstUsedAt: '', lastUsedAt: '' };
  }
  
  try {
    const stored = localStorage.getItem(GUEST_USAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading guest usage:', e);
  }
  
  return {
    queriesUsed: 0,
    documentsUploaded: 0,
    firstUsedAt: '',
    lastUsedAt: '',
  };
}

/**
 * Save guest usage to localStorage
 */
function saveGuestUsage(usage: GuestUsage): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage));
  } catch (e) {
    console.error('Error saving guest usage:', e);
  }
}

/**
 * Get remaining free queries for guest
 */
export function getRemainingGuestQueries(): number {
  const usage = getGuestUsage();
  return Math.max(0, GUEST_LIMIT - usage.queriesUsed);
}

/**
 * Check if guest can perform an action
 */
export function canGuestPerformAction(action: 'query' | 'upload'): boolean {
  const usage = getGuestUsage();
  
  switch (action) {
    case 'query':
      return usage.queriesUsed < GUEST_LIMIT;
    case 'upload':
      return usage.documentsUploaded < GUEST_LIMIT;
    default:
      return false;
  }
}

/**
 * Check if guest has reached their limit
 */
export function hasGuestReachedLimit(): boolean {
  const usage = getGuestUsage();
  return usage.queriesUsed >= GUEST_LIMIT;
}

/**
 * Record a guest action (call after successful action)
 */
export function recordGuestAction(action: 'query' | 'upload'): GuestUsage {
  const usage = getGuestUsage();
  const now = new Date().toISOString();
  
  if (!usage.firstUsedAt) {
    usage.firstUsedAt = now;
  }
  usage.lastUsedAt = now;
  
  switch (action) {
    case 'query':
      usage.queriesUsed += 1;
      break;
    case 'upload':
      usage.documentsUploaded += 1;
      break;
  }
  
  saveGuestUsage(usage);
  return usage;
}

/**
 * Get the guest limit constant
 */
export function getGuestLimit(): number {
  return GUEST_LIMIT;
}

/**
 * Reset guest usage (for testing or after sign-in)
 */
export function resetGuestUsage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_USAGE_KEY);
}
