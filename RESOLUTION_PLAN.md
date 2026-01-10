# Resolution Plan for Next Steps
**Following DEVELOPMENT_PROTOCOL.md Methodology**

---

## 🎯 Items to Resolve

1. **Test Bug 5 edge cases in real scenarios**
2. **Investigate Bug 3 (cache issue) - may be related to Bug 5**
3. **Consider adding loading states to prevent race conditions**

---

## 📋 Resolution Plan

### Item 1: Fix Bug 5 Edge Cases (Inconsistent Auth State)

#### Step 1: Understand the Full Context ✅
**Files to Review:**
- `lib/auth/AuthContext.tsx` - Auth state management
- `app/components/layout/AppShell.tsx` - Main layout with auth display
- `app/components/features/CreditBalance.tsx` - BYOK/credits display
- `app/components/features/GuestUsageIndicator.tsx` - Guest mode display

**Current Flow:**
```
AuthContext (loading: true) → AppShell checks `user` → Conditional render
  ↓
If `user` exists → CreditBalance (checks BYOK internally)
If `user` is null → GuestUsageIndicator
```

**Problem Identified:**
- Race condition: `loading` state from AuthContext not used in AppShell
- BYOK check happens asynchronously in CreditBalance
- No loading state during auth/BYOK checks

#### Step 2: Find Working Examples ✅
**Working Pattern Found:**
- `ProtectedRoute.tsx` (lines 42-44): Uses `loading` state properly
  ```typescript
  if (loading) {
    return fallback || <LoadingScreen />;
  }
  ```

#### Step 3: Verify Function Signatures ✅
- `useAuth()` returns: `{ user, loading, ... }`
- `CreditBalance` receives: `{ onBuyCredits, showBuyButton, compact }`
- `CreditBalance` uses `useAuth()` internally but doesn't use `loading`

#### Step 4: Calculate/Verify Logic ✅
**Current Logic:**
```typescript
// AppShell.tsx line 293-306
{!loading && (
  <>
    {user ? (
      <CreditBalance compact onBuyCredits={...} />
    ) : (
      <GuestUsageIndicator onSignUpClick={...} />
    )}
  </>
)}
```

**Issues:**
1. `loading` check exists but may not cover all edge cases
2. CreditBalance has its own `loading` state that's not coordinated
3. BYOK check in CreditBalance is async and may cause flicker

#### Step 5: Implementation Plan

**Fix 1: Add Loading State to AppShell Auth Display**
```typescript
// Show loading skeleton during auth check
{loading ? (
  <div style={loadingSkeletonStyle}>Loading...</div>
) : (
  <>
    {user ? (
      <CreditBalance compact onBuyCredits={...} />
    ) : (
      <GuestUsageIndicator onSignUpClick={...} />
    )}
  </>
)}
```

**Fix 2: Coordinate BYOK Check with Auth Loading**
- Pass `loading` prop to CreditBalance
- CreditBalance should show loading state if auth is loading OR BYOK is checking
- Prevent double-rendering of Guest/BYOK states

**Fix 3: Add Debouncing for BYOK State Changes**
- Debounce BYOK checks to prevent rapid state changes
- Use `useMemo` or `useCallback` to stabilize checks

**Files to Modify:**
1. `app/components/layout/AppShell.tsx` - Add loading state handling
2. `app/components/features/CreditBalance.tsx` - Accept loading prop, coordinate states

---

### Item 2: Investigate Bug 3 (Cache Issue)

#### Step 1: Understand the Full Context ✅
**Symptoms:**
- Old UI appears (Add Content button in sidebar instead of FAB)
- Integrations as separate menu item (should be in Settings)
- Guest indicator showing even when signed in with BYOK

**Possible Causes:**
1. **Vercel Build Cache** - Old build artifacts served
2. **Browser Cache** - Cached JavaScript/CSS files
3. **Service Worker** - If PWA is enabled, old service worker may cache
4. **React State Hydration** - SSR/CSR mismatch
5. **localStorage State** - Old state from previous version

#### Step 2: Find Working Examples ✅
**Check for:**
- Service worker registration
- Cache headers in Next.js config
- Build output verification

#### Step 3: Investigation Plan

**Investigation 1: Check for Service Worker**
```bash
# Search for service worker registration
grep -r "serviceWorker" .
grep -r "registerSW" .
grep -r "workbox" .
```

**Investigation 2: Check Next.js Cache Configuration**
- Review `next.config.js` or `next.config.ts`
- Check for cache headers
- Verify build output

**Investigation 3: Check localStorage Migration**
- Old localStorage keys might conflict
- Need migration strategy for old keys

**Investigation 4: Check Component Versioning**
- Verify all components are using latest code
- Check for duplicate component definitions

**Files to Check:**
1. `next.config.js` / `next.config.ts`
2. `app/layout.tsx` - Check for service worker
3. `package.json` - Check for PWA dependencies
4. All component files for version consistency

**Fix Strategy:**
1. Add version check in localStorage
2. Clear old cache on version mismatch
3. Add cache-busting headers
4. Add migration script for old localStorage keys

---

### Item 3: Add Loading States to Prevent Race Conditions

#### Step 1: Understand the Full Context ✅
**Current State:**
- AuthContext has `loading` state
- CreditBalance has its own `loading` state
- BYOK check is async but no loading indicator
- No coordination between multiple loading states

#### Step 2: Find Working Examples ✅
**Working Pattern:**
- `ProtectedRoute.tsx` - Shows loading screen during auth check
- Various components use skeleton loaders

#### Step 3: Implementation Plan

**Fix 1: Unified Loading State**
```typescript
// Create a unified auth/BYOK loading state
const [authStateLoading, setAuthStateLoading] = useState(true);

useEffect(() => {
  // Wait for both auth and BYOK checks
  if (!loading && byokCheckComplete) {
    setAuthStateLoading(false);
  }
}, [loading, byokCheckComplete]);
```

**Fix 2: Skeleton Loader Component**
- Create reusable skeleton for auth display area
- Show skeleton during loading states
- Smooth transition to actual content

**Fix 3: Debounce State Updates**
- Use `useDebounce` hook for BYOK checks
- Prevent rapid state flickering
- Batch state updates

**Files to Modify:**
1. `app/components/layout/AppShell.tsx` - Add unified loading state
2. `app/components/features/CreditBalance.tsx` - Coordinate with auth loading
3. Create `app/components/ui/Skeleton.tsx` if not exists (already exists, verify usage)

---

## 🔧 Implementation Steps

### Phase 1: Fix Bug 5 Edge Cases (Priority: High)

1. **Update AppShell.tsx**
   - [ ] Use `loading` from `useAuth()` in conditional render
   - [ ] Add loading skeleton during auth check
   - [ ] Ensure no flicker between Guest/BYOK states

2. **Update CreditBalance.tsx**
   - [ ] Accept `loading` prop from parent
   - [ ] Coordinate BYOK check with auth loading
   - [ ] Show loading state during BYOK check
   - [ ] Prevent rendering "Guest Mode" when auth is loading

3. **Add Debouncing**
   - [ ] Create `useDebounce` hook or use existing
   - [ ] Debounce BYOK state checks
   - [ ] Prevent rapid state changes

4. **Test Edge Cases**
   - [ ] Test: Sign in while having BYOK key
   - [ ] Test: Add BYOK key while signed in
   - [ ] Test: Remove BYOK key while signed in
   - [ ] Test: Sign out while BYOK is active
   - [ ] Test: Rapid sign in/out

### Phase 2: Investigate Bug 3 (Cache Issue) (Priority: Medium)

1. **Check for Service Worker**
   - [ ] Search codebase for service worker registration
   - [ ] Check if PWA is enabled
   - [ ] Verify service worker cache strategy

2. **Check Next.js Configuration**
   - [ ] Review `next.config.js`
   - [ ] Check cache headers
   - [ ] Verify build output

3. **Check localStorage Migration**
   - [ ] Identify old localStorage keys
   - [ ] Create migration script
   - [ ] Add version check

4. **Add Cache-Busting**
   - [ ] Add version to build
   - [ ] Clear cache on version mismatch
   - [ ] Add cache headers

### Phase 3: Add Loading States (Priority: Medium)

1. **Create Unified Loading Hook**
   - [ ] Create `useAuthState` hook
   - [ ] Combines auth loading + BYOK checking
   - [ ] Returns unified loading state

2. **Update Components**
   - [ ] Use unified loading state in AppShell
   - [ ] Update CreditBalance to use coordinated loading
   - [ ] Add skeleton loaders

3. **Test Loading States**
   - [ ] Verify no flicker during transitions
   - [ ] Test slow network conditions
   - [ ] Test rapid state changes

---

## 📝 Verification Checklist

Before committing fixes:

- [ ] Read ALL relevant files (AuthContext, AppShell, CreditBalance, GuestUsageIndicator)
- [ ] Understand full context (auth flow, BYOK check flow)
- [ ] Verified function signatures (useAuth, CreditBalance props)
- [ ] Calculated/verified logic (loading state coordination)
- [ ] Checked dependencies (all imports exist)
- [ ] Compared with working examples (ProtectedRoute pattern)
- [ ] Run linter checks
- [ ] Check for TypeScript errors
- [ ] Test all edge cases manually
- [ ] Verify no race conditions
- [ ] Confirm no UI flicker

---

## 🎯 Expected Outcomes

### After Fixing Bug 5:
- ✅ No simultaneous display of Guest and BYOK indicators
- ✅ Smooth transitions between auth states
- ✅ No flicker during sign in/out
- ✅ BYOK state updates correctly

### After Investigating Bug 3:
- ✅ Identify root cause of cache issues
- ✅ Implement cache-busting strategy
- ✅ Add version migration for localStorage
- ✅ Prevent old UI from appearing

### After Adding Loading States:
- ✅ Smooth loading transitions
- ✅ No race conditions
- ✅ Better UX during state changes
- ✅ Coordinated loading states

---

## 📅 Estimated Effort

- **Item 1 (Bug 5):** 2-3 hours
- **Item 2 (Bug 3):** 1-2 hours (investigation) + 1-2 hours (fix)
- **Item 3 (Loading States):** 1-2 hours

**Total:** 5-9 hours

---

**Methodology:** Following DEVELOPMENT_PROTOCOL.md systematically
**Status:** Ready for implementation
