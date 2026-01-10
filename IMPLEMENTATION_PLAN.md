# Detailed Implementation Plan
**Following DEVELOPMENT_PROTOCOL.md - Step-by-Step Resolution**

---

## 🎯 Resolution Strategy for Items 1-3

### Item 1: Fix Bug 5 Edge Cases (Inconsistent Auth State)

#### Problem Analysis
**Current Issue:**
- AppShell checks `!loading` but doesn't show loading state during auth check
- CreditBalance has its own `loading` state that's not coordinated
- BYOK check happens asynchronously, causing potential race conditions
- No debouncing for rapid state changes

**Root Cause:**
- Multiple independent loading states (auth loading, BYOK checking, balance loading)
- No coordination between states
- CreditBalance renders "Guest Mode" when `!user` even if auth is still loading

#### Solution Design

**Step 1: Update AppShell.tsx**
```typescript
// Current (line 293-306):
{!loading && (
  <>
    {user ? (
      <CreditBalance compact onBuyCredits={...} />
    ) : (
      <GuestUsageIndicator onSignUpClick={...} />
    )}
  </>
)}

// Fixed:
{loading ? (
  <div style={authLoadingSkeletonStyle}>
    <Skeleton width="80px" height="32px" variant="rounded" />
  </div>
) : (
  <>
    {user ? (
      <CreditBalance 
        compact 
        onBuyCredits={...}
        authLoading={loading}  // Pass loading state
      />
    ) : (
      <GuestUsageIndicator onSignUpClick={...} />
    )}
  </>
)}
```

**Step 2: Update CreditBalance.tsx**
```typescript
// Add authLoading prop
interface CreditBalanceProps {
  onBuyCredits?: () => void;
  showBuyButton?: boolean;
  compact?: boolean;
  authLoading?: boolean;  // NEW
}

// Update early return logic
// Current (line 115-122):
if (!user) {
  if (compact) return null;
  return <div>Guest Mode</div>;
}

// Fixed:
if (!user) {
  // Don't show "Guest Mode" if auth is still loading
  if (authLoading) {
    return compact ? null : <Skeleton width="80px" height="32px" />;
  }
  if (compact) return null;
  return <div>Guest Mode</div>;
}

// Add debouncing for BYOK checks
useEffect(() => {
  const checkByok = () => {
    // Debounce the check
    const timeoutId = setTimeout(() => {
      setHasByok(hasActiveBYOKKey());
    }, 100);
    return () => clearTimeout(timeoutId);
  };
  // ... rest of logic
}, []);
```

**Step 3: Add Skeleton Style**
```typescript
const authLoadingSkeletonStyle: React.CSSProperties = {
  width: '80px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
```

#### Files to Modify:
1. `app/components/layout/AppShell.tsx` - Lines 290-306
2. `app/components/features/CreditBalance.tsx` - Lines 7-11, 54-85, 115-122

---

### Item 2: Investigate Bug 3 (Cache Issue)

#### Investigation Steps

**Step 1: Check for Service Worker** ✅
- **Result:** No service worker found in codebase
- **Conclusion:** Not a service worker issue

**Step 2: Check Next.js Configuration**
- **Action:** Check if `next.config.js` exists
- **Action:** Review cache headers
- **Action:** Check build output

**Step 3: Check localStorage Versioning**
- **Action:** Add version check to localStorage
- **Action:** Clear old cache on version mismatch
- **Action:** Migrate old localStorage keys

**Step 4: Add Cache-Busting Strategy**
```typescript
// Add to app/layout.tsx or _document.tsx
const APP_VERSION = '1.0.0'; // Update on breaking changes

useEffect(() => {
  const storedVersion = localStorage.getItem('moonscribe-version');
  if (storedVersion !== APP_VERSION) {
    // Clear old cache
    localStorage.clear();
    localStorage.setItem('moonscribe-version', APP_VERSION);
    // Force reload to get new code
    window.location.reload();
  }
}, []);
```

**Step 5: Add Build Version to Package**
```json
// package.json - add version tracking
{
  "version": "0.1.0",
  "scripts": {
    "build": "next build && echo 'Build completed at $(date)' > .build-info"
  }
}
```

#### Files to Check/Modify:
1. `app/layout.tsx` - Add version check
2. `package.json` - Verify version
3. Create migration script for old localStorage keys

---

### Item 3: Add Loading States to Prevent Race Conditions

#### Solution Design

**Step 1: Create Unified Auth State Hook**
```typescript
// lib/hooks/useAuthState.ts (NEW FILE)
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';

export function useAuthState() {
  const { user, loading: authLoading } = useAuth();
  const [byokLoading, setByokLoading] = useState(true);
  const [hasByok, setHasByok] = useState(false);

  useEffect(() => {
    if (authLoading) {
      setByokLoading(true);
      return;
    }

    // Check BYOK asynchronously
    const checkByok = async () => {
      setByokLoading(true);
      // Small delay to prevent flicker
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (typeof window !== 'undefined') {
        const hasActive = hasActiveBYOKKey();
        setHasByok(hasActive);
      }
      setByokLoading(false);
    };

    checkByok();
  }, [authLoading, user]);

  return {
    user,
    loading: authLoading || byokLoading,
    hasByok,
    isReady: !authLoading && !byokLoading,
  };
}
```

**Step 2: Update AppShell to Use Unified Hook**
```typescript
// Replace useAuth() with useAuthState()
const { user, loading, hasByok, isReady } = useAuthState();

// Update render logic
{loading ? (
  <Skeleton width="80px" height="32px" variant="rounded" />
) : isReady ? (
  <>
    {user ? (
      <CreditBalance compact onBuyCredits={...} hasByok={hasByok} />
    ) : (
      <GuestUsageIndicator onSignUpClick={...} />
    )}
  </>
) : null}
```

**Step 3: Update CreditBalance to Accept hasByok Prop**
```typescript
interface CreditBalanceProps {
  onBuyCredits?: () => void;
  showBuyButton?: boolean;
  compact?: boolean;
  hasByok?: boolean;  // NEW - passed from parent
}

// Use prop instead of checking internally
if (hasByok) {
  // Show BYOK badge
}
```

#### Files to Create/Modify:
1. `lib/hooks/useAuthState.ts` - NEW FILE
2. `app/components/layout/AppShell.tsx` - Use new hook
3. `app/components/features/CreditBalance.tsx` - Accept hasByok prop

---

## 📋 Implementation Checklist

### Phase 1: Fix Bug 5 (Priority: High)

- [ ] **Step 1.1:** Read `app/components/layout/AppShell.tsx` (lines 290-306)
- [ ] **Step 1.2:** Read `app/components/features/CreditBalance.tsx` (full file)
- [ ] **Step 1.3:** Read `lib/auth/AuthContext.tsx` (verify loading state)
- [ ] **Step 1.4:** Understand: AppShell → CreditBalance → BYOK check flow
- [ ] **Step 1.5:** Find working example: `ProtectedRoute.tsx` loading pattern
- [ ] **Step 1.6:** Verify: `useAuth()` returns `{ user, loading, ... }`
- [ ] **Step 1.7:** Calculate: Loading state coordination logic
- [ ] **Step 1.8:** Update AppShell.tsx to show skeleton during loading
- [ ] **Step 1.9:** Update CreditBalance.tsx to accept `authLoading` prop
- [ ] **Step 1.10:** Add debouncing to BYOK checks (100ms delay)
- [ ] **Step 1.11:** Test: Sign in with BYOK key
- [ ] **Step 1.12:** Test: Add BYOK key while signed in
- [ ] **Step 1.13:** Test: Remove BYOK key while signed in
- [ ] **Step 1.14:** Test: Rapid sign in/out
- [ ] **Step 1.15:** Run linter
- [ ] **Step 1.16:** Check TypeScript errors
- [ ] **Step 1.17:** Verify no race conditions
- [ ] **Step 1.18:** Commit with detailed message

### Phase 2: Investigate Bug 3 (Priority: Medium)

- [ ] **Step 2.1:** Check for `next.config.js` or `next.config.ts`
- [ ] **Step 2.2:** Review Next.js cache configuration
- [ ] **Step 2.3:** Check `app/layout.tsx` for cache headers
- [ ] **Step 2.4:** Identify old localStorage keys that might conflict
- [ ] **Step 2.5:** Create version check in `app/layout.tsx`
- [ ] **Step 2.6:** Add localStorage migration script
- [ ] **Step 2.7:** Test: Clear cache and verify new UI loads
- [ ] **Step 2.8:** Test: Old localStorage keys are migrated
- [ ] **Step 2.9:** Document cache-busting strategy
- [ ] **Step 2.10:** Commit with detailed message

### Phase 3: Add Loading States (Priority: Medium)

- [ ] **Step 3.1:** Create `lib/hooks/useAuthState.ts`
- [ ] **Step 3.2:** Implement unified auth/BYOK loading hook
- [ ] **Step 3.3:** Add debouncing (50ms delay)
- [ ] **Step 3.4:** Update AppShell.tsx to use `useAuthState()`
- [ ] **Step 3.5:** Update CreditBalance.tsx to accept `hasByok` prop
- [ ] **Step 3.6:** Remove internal BYOK check from CreditBalance
- [ ] **Step 3.7:** Test: Loading states show correctly
- [ ] **Step 3.8:** Test: No flicker during transitions
- [ ] **Step 3.9:** Test: Slow network conditions
- [ ] **Step 3.10:** Run linter
- [ ] **Step 3.11:** Check TypeScript errors
- [ ] **Step 3.12:** Commit with detailed message

---

## 🔍 Verification Steps

### For Each Fix:

1. **Read ALL relevant files** ✅
2. **Understand full context** ✅
3. **Verify function signatures** ✅
4. **Calculate/verify logic** ✅
5. **Check dependencies** ✅
6. **Compare with working examples** ✅
7. **Run linter** ✅
8. **Check TypeScript errors** ✅
9. **Test edge cases** ✅
10. **Verify no race conditions** ✅

---

## 📝 Expected Code Changes Summary

### Files to Modify:
1. `app/components/layout/AppShell.tsx` - Add loading skeleton, use unified hook
2. `app/components/features/CreditBalance.tsx` - Accept props, remove internal BYOK check
3. `app/layout.tsx` - Add version check for cache-busting

### Files to Create:
1. `lib/hooks/useAuthState.ts` - Unified auth/BYOK state hook

### Estimated Lines Changed:
- AppShell.tsx: ~20 lines
- CreditBalance.tsx: ~30 lines
- app/layout.tsx: ~15 lines
- useAuthState.ts: ~50 lines (new file)

**Total:** ~115 lines of code changes

---

## 🎯 Success Criteria

### Bug 5 Fixed:
- ✅ No simultaneous Guest/BYOK display
- ✅ Smooth transitions between states
- ✅ No flicker during sign in/out
- ✅ BYOK state updates correctly

### Bug 3 Resolved:
- ✅ Root cause identified
- ✅ Cache-busting implemented
- ✅ Version migration working
- ✅ Old UI doesn't appear

### Loading States Added:
- ✅ Unified loading state
- ✅ No race conditions
- ✅ Smooth transitions
- ✅ Better UX

---

**Status:** Ready for implementation
**Methodology:** Following DEVELOPMENT_PROTOCOL.md systematically
**Next Action:** Begin Phase 1 implementation
