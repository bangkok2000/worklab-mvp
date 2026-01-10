# Test Plan for Bug Fixes (Bugs 3 & 5)

**Following DEVELOPMENT_PROTOCOL.md Verification Steps**

---

## ✅ Code Verification (Static Analysis)

### Phase 1: Bug 5 Fixes - Code Review

#### AppShell.tsx Changes
- ✅ **Line 294-304:** Shows skeleton during `loading` state
- ✅ **Line 308:** Passes `authLoading={loading}` to CreditBalance
- ✅ **Logic:** `loading ? skeleton : (user ? CreditBalance : GuestUsageIndicator)`
- ✅ **Verification:** Prevents rendering Guest/BYOK during auth check

#### CreditBalance.tsx Changes
- ✅ **Line 11:** Added `authLoading?: boolean` to interface
- ✅ **Line 53:** Accepts `authLoading = false` in props
- ✅ **Lines 60-76:** Added 100ms debouncing to BYOK checks
- ✅ **Lines 125-137:** Prevents showing "Guest Mode" when `authLoading` is true
- ✅ **Logic:** `if (!user && authLoading) return skeleton`
- ✅ **Verification:** No race condition between Guest and BYOK states

### Phase 2: Bug 3 Fixes - Code Review

#### VersionCheck.tsx
- ✅ **Line 9:** APP_VERSION constant defined
- ✅ **Lines 15-16:** Checks localStorage for version
- ✅ **Lines 18-35:** Clears cache on version mismatch
- ✅ **Line 40:** Forces reload after clearing cache
- ✅ **Verification:** Prevents old cached UI from appearing

#### app/layout.tsx
- ✅ **Line 3:** Imports VersionCheck
- ✅ **Line 25:** Renders VersionCheck at root
- ✅ **Verification:** Version check runs on every page load

---

## 🧪 Manual Testing Checklist

### Test 1: Bug 5 - Auth Loading State

**Scenario:** User signs in while having BYOK key

**Steps:**
1. Clear browser cache and localStorage
2. Open app (should show Guest indicator)
3. Sign in with account that has BYOK key configured
4. **Expected:** 
   - Skeleton shows briefly during auth loading
   - Then shows BYOK badge (not Guest Mode)
   - No flicker between states

**Status:** ⏳ **Needs Manual Testing**

---

### Test 2: Bug 5 - Add BYOK While Signed In

**Scenario:** User adds BYOK key while already signed in

**Steps:**
1. Sign in without BYOK key (should show credits)
2. Go to Settings → API Keys
3. Add OpenAI API key
4. **Expected:**
   - Credits display changes to BYOK badge
   - No flicker or "Guest Mode" appears
   - Transition is smooth

**Status:** ⏳ **Needs Manual Testing**

---

### Test 3: Bug 5 - Remove BYOK While Signed In

**Scenario:** User removes BYOK key while signed in

**Steps:**
1. Sign in with BYOK key (should show BYOK badge)
2. Go to Settings → API Keys
3. Delete/disable the API key
4. **Expected:**
   - BYOK badge changes to credits display
   - No "Guest Mode" appears
   - Transition is smooth

**Status:** ⏳ **Needs Manual Testing**

---

### Test 4: Bug 5 - Rapid Sign In/Out

**Scenario:** User rapidly signs in and out

**Steps:**
1. Sign in
2. Immediately sign out
3. Immediately sign in again
4. Repeat 3-4 times rapidly
5. **Expected:**
   - No simultaneous Guest/BYOK display
   - Loading states show correctly
   - No console errors

**Status:** ⏳ **Needs Manual Testing**

---

### Test 5: Bug 3 - Version Mismatch Cache Clear

**Scenario:** App version changes, old cache should clear

**Steps:**
1. Set localStorage: `localStorage.setItem('moonscribe-version', '0.9.0')`
2. Load app (current version is '1.0.0')
3. **Expected:**
   - Console log: "Version mismatch: stored=0.9.0, current=1.0.0"
   - localStorage cleared (except version)
   - Page reloads automatically
   - New version stored: '1.0.0'

**Status:** ⏳ **Needs Manual Testing**

---

### Test 6: Bug 3 - First Time User

**Scenario:** New user with no version in localStorage

**Steps:**
1. Clear all localStorage
2. Load app
3. **Expected:**
   - Version '1.0.0' is set in localStorage
   - No errors
   - App loads normally

**Status:** ⏳ **Needs Manual Testing**

---

### Test 7: Loading States - No Flicker

**Scenario:** Verify smooth loading transitions

**Steps:**
1. Open app in incognito mode
2. Observe header area during initial load
3. Sign in and observe header area
4. **Expected:**
   - Skeleton shows during loading
   - Smooth transition to final state
   - No flicker or rapid state changes

**Status:** ⏳ **Needs Manual Testing**

---

## 🔍 Logic Verification (Code Analysis)

### Debouncing Logic ✅
```typescript
// CreditBalance.tsx lines 60-76
timeoutId = setTimeout(() => {
  setHasByok(hasActiveBYOKKey());
}, 100);
```
**Verification:** ✅ 100ms debounce prevents rapid state changes

### Auth Loading Check ✅
```typescript
// CreditBalance.tsx lines 125-137
if (!user && authLoading) {
  return skeleton; // Don't show "Guest Mode" during loading
}
```
**Verification:** ✅ Prevents race condition

### Version Check Logic ✅
```typescript
// VersionCheck.tsx lines 18-40
if (storedVersion !== APP_VERSION) {
  localStorage.clear();
  localStorage.setItem('moonscribe-version', APP_VERSION);
  window.location.reload();
}
```
**Verification:** ✅ Clears cache and reloads on mismatch

---

## 📊 Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Code Review | ✅ **PASS** | All logic verified |
| TypeScript Check | ✅ **PASS** | No linter errors |
| Logic Verification | ✅ **PASS** | All edge cases handled |
| Manual Test 1 | ⏳ **PENDING** | Needs browser testing |
| Manual Test 2 | ⏳ **PENDING** | Needs browser testing |
| Manual Test 3 | ⏳ **PENDING** | Needs browser testing |
| Manual Test 4 | ⏳ **PENDING** | Needs browser testing |
| Manual Test 5 | ⏳ **PENDING** | Needs browser testing |
| Manual Test 6 | ⏳ **PENDING** | Needs browser testing |
| Manual Test 7 | ⏳ **PENDING** | Needs browser testing |

---

## 🎯 Automated Test Script (For Future)

```typescript
// test/auth-state.test.ts (Future implementation)
describe('Auth State Management', () => {
  it('should show skeleton during auth loading', () => {
    // Mock loading state
    // Verify skeleton renders
  });

  it('should not show Guest Mode during auth loading', () => {
    // Mock authLoading = true, user = null
    // Verify "Guest Mode" does not appear
  });

  it('should debounce BYOK checks', () => {
    // Mock rapid API key changes
    // Verify only last state is applied
  });
});
```

---

## ✅ Pre-Commit Verification Checklist

- [x] Read ALL relevant files
- [x] Understand full context
- [x] Verified function signatures match usage
- [x] Calculated/verified all values
- [x] Compared with working examples (ProtectedRoute pattern)
- [x] Run linter checks (no errors)
- [x] Verified logic is correct
- [x] Checked for TypeScript errors (no errors)
- [x] Accounted for all edge cases
- [x] Confident fixes are correct

---

## 📝 Manual Testing Instructions

### To Test Bug 5 Fixes:

1. **Open Browser DevTools** (F12)
2. **Go to Console tab** - Watch for errors
3. **Test Sign In Flow:**
   - Sign out if logged in
   - Sign in
   - Observe header area - should show skeleton → BYOK/Credits (no Guest Mode)
4. **Test BYOK Addition:**
   - Sign in without BYOK
   - Add API key in Settings
   - Observe header - should transition smoothly
5. **Test Rapid Changes:**
   - Rapidly add/remove API key
   - Should not flicker or show errors

### To Test Bug 3 Fixes:

1. **Open Browser DevTools** (F12)
2. **Go to Application tab → Local Storage**
3. **Set old version:**
   ```javascript
   localStorage.setItem('moonscribe-version', '0.9.0')
   ```
4. **Reload page**
5. **Expected:** Console shows version mismatch, localStorage cleared, page reloads
6. **Verify:** New version '1.0.0' is set

---

**Status:** Code verification complete ✅ | Manual testing pending ⏳
