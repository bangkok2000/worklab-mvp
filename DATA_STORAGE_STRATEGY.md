# Data Storage Strategy - User Type Analysis

**Date:** January 2026  
**Purpose:** Document where user data is saved for each user type

---

## 📊 Current Implementation: Local-First Architecture

**Key Principle:** "Your Keys → Your Data → Your Control"

The app uses a **local-first** approach where **ALL user content is stored in browser localStorage**, regardless of user type or payment status.

### Planned Implementation (Not Yet Implemented)

According to `TODO.md` line 583:
- ✅ **"Optional cloud sync (Supabase ready)"** - Marked as completed
- ⚠️ **Reality:** Infrastructure is ready (Supabase configured), but **sync functionality is NOT implemented**
- 📋 **Planned:** Optional cloud sync for paid users using Supabase Storage
- 🎯 **Strategy:** Keep localStorage as primary, with optional cloud backup for paid users

**From ARCHITECTURE.md:**
- The "Local-First Philosophy" is intentional - privacy-focused design
- Supabase infrastructure exists for cloud sync, but sync code not written
- Current implementation matches the documented architecture (localStorage for all)

---

## 📚 Planned Implementation (From Documentation)

### What the Documentation Says

**ARCHITECTURE.md (Lines 124-150):**
- **Local-First Philosophy:** "Your Keys → Your Data → Your Control"
- **Storage Locations Table:**
  - Projects: localStorage
  - Insights: localStorage
  - Inbox Content: localStorage
  - Personal API Keys: localStorage (AES-GCM client-side)
- **Why This Approach:**
  1. BYOK Consistent: If we respect privacy for keys, we should for data too
  2. No account required: Basic use works without sign-up
  3. Team-friendly: Shared API key simplifies team onboarding
  4. Enterprise-safe: Sensitive data controllable

**TODO.md (Line 583):**
- ✅ `[x] Optional cloud sync (Supabase ready)`
- **Status:** Infrastructure ready, but sync code not implemented

**PRODUCT_STRATEGY.md:**
- **Privacy-First** positioning
- **Local-First Option** as competitive differentiator
- Mentions "Local storage options" in settings

**INSTRUCTIONS.md (Line 296):**
- **Data Storage:**
  - Local Storage: Projects, Insights, Inbox content
  - Supabase: User auth, credits, teams, team API keys (encrypted)
  - Pinecone: Vector embeddings (text chunks only)

### Planned vs. Current

| Aspect | Current | Planned (From Docs) |
|--------|---------|---------------------|
| **Free Users** | localStorage only | localStorage only ✅ |
| **Paid Users** | localStorage only | localStorage primary + optional Supabase sync 📋 |
| **BYOK Users** | localStorage only | localStorage primary + optional Supabase sync 📋 |
| **Infrastructure** | Supabase configured | Supabase ready ✅ |
| **Sync Code** | Not implemented | Not implemented ❌ |
| **Philosophy** | Local-first | Local-first ✅ |

**Key Finding:** The current implementation **matches the documented architecture** (local-first). The "optional cloud sync" is planned but not implemented - infrastructure is ready, but sync functionality code doesn't exist.

---

## 🗂️ Data Storage by User Type

### 1. **Free User (Guest Mode)**
**Status:** ✅ **Implemented**

**Data Storage Location:**
- **Projects:** `localStorage.getItem('moonscribe-projects')`
- **Project Content:** `localStorage.getItem('moonscribe-project-content-${projectId}')`
- **Insights:** `localStorage.getItem('moonscribe_insights_v2')`
- **Inbox:** `localStorage.getItem('moonscribe-inbox')`
- **API Keys (if added):** `localStorage.getItem('moonscribe-keys-anonymous')`
- **Conversations:** `localStorage.getItem('moonscribe-project-${projectId}-conversations')`
- **Vector Embeddings:** Pinecone (text chunks only, no user data)

**Authentication:**
- ❌ No account required
- ❌ No Supabase auth
- ✅ Works completely offline (after initial load)

**Limitations:**
- 5 free queries (tracked in localStorage)
- No cloud sync
- Data lost if browser data cleared
- No cross-device access

---

### 2. **Paid User (No Personal API Key) - Using Credits**
**Status:** ✅ **Implemented**

**Data Storage Location:**
- **Projects:** `localStorage.getItem('moonscribe-projects')` ⚠️ **SAME AS FREE**
- **Project Content:** `localStorage.getItem('moonscribe-project-content-${projectId}')` ⚠️ **SAME AS FREE**
- **Insights:** `localStorage.getItem('moonscribe_insights_v2')` ⚠️ **SAME AS FREE**
- **Inbox:** `localStorage.getItem('moonscribe-inbox')` ⚠️ **SAME AS FREE**
- **Credits Balance:** Supabase (`credits` table)
- **Credit Transactions:** Supabase (`credit_transactions` table)
- **Vector Embeddings:** Pinecone (with `user_id` and `project_id` metadata)

**Authentication:**
- ✅ Supabase Auth (email/password)
- ✅ User ID stored in Supabase
- ✅ Session managed by Supabase

**What's Different from Free:**
- ✅ Credits tracked in Supabase (persistent across devices)
- ✅ Unlimited queries (if credits available)
- ⚠️ **BUT: Projects/Insights/Content still in localStorage** (not synced to cloud)

**Issue:** Paid users' content is NOT synced to cloud - still localStorage only!

---

### 3. **Paid User (With Personal API Key - BYOK)**
**Status:** ✅ **Implemented**

**Data Storage Location:**
- **Projects:** `localStorage.getItem('moonscribe-projects')` ⚠️ **SAME AS FREE**
- **Project Content:** `localStorage.getItem('moonscribe-project-content-${projectId}')` ⚠️ **SAME AS FREE**
- **Insights:** `localStorage.getItem('moonscribe_insights_v2')` ⚠️ **SAME AS FREE**
- **Inbox:** `localStorage.getItem('moonscribe-inbox')` ⚠️ **SAME AS FREE**
- **Personal API Keys:** `localStorage.getItem('moonscribe-keys-${userId}')` (encrypted with AES-GCM)
- **Credits Balance:** Supabase (if they have credits)
- **Vector Embeddings:** Pinecone (with `user_id` and `project_id` metadata)

**Authentication:**
- ✅ Supabase Auth (email/password)
- ✅ User ID stored in Supabase
- ✅ Session managed by Supabase

**What's Different:**
- ✅ Uses own API key (no credits deducted)
- ✅ API key encrypted client-side (AES-GCM)
- ⚠️ **BUT: Projects/Insights/Content still in localStorage** (not synced to cloud)

**Issue:** Even BYOK users' content is NOT synced to cloud - still localStorage only!

---

### 4. **Paid User (No Personal Key + "Own Drive")**
**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- "Google Drive" mentioned in TODO.md as future feature
- Settings page shows "Google Drive" integration option (UI only)
- No actual Google Drive sync implemented
- No cloud storage sync for user data

**What Should Happen (Not Implemented):**
- Projects should sync to Google Drive (or user's cloud storage)
- Insights should sync to Google Drive
- Content should sync to Google Drive
- Cross-device access via cloud storage

**Current Reality:**
- ⚠️ **Still uses localStorage** (same as free users)
- ⚠️ No cloud sync at all
- ⚠️ Data not accessible from other devices

---

### 5. **Paid User (With Personal Key + "Own Drive")**
**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- Same as #4 - no cloud sync implemented
- "Own Drive" is a planned feature, not implemented

**What Should Happen (Not Implemented):**
- Projects sync to user's cloud storage (Google Drive, Dropbox, etc.)
- Insights sync to cloud storage
- Content sync to cloud storage
- API keys stored in cloud (encrypted)
- Cross-device access

**Current Reality:**
- ⚠️ **Still uses localStorage** (same as free users)
- ⚠️ No cloud sync at all
- ⚠️ Data not accessible from other devices

---

## 📍 Summary Table

| User Type | Projects | Insights | Inbox | API Keys | Credits | Cloud Sync |
|-----------|----------|----------|-------|----------|---------|------------|
| **Free (Guest)** | localStorage | localStorage | localStorage | localStorage | N/A | ❌ None |
| **Paid (No Key)** | localStorage | localStorage | localStorage | N/A | Supabase | ❌ None |
| **Paid (BYOK)** | localStorage | localStorage | localStorage | localStorage | Supabase | ❌ None |
| **Paid (No Key + Drive)** | localStorage | localStorage | localStorage | N/A | Supabase | ❌ **Not Implemented** |
| **Paid (BYOK + Drive)** | localStorage | localStorage | localStorage | localStorage | Supabase | ❌ **Not Implemented** |

---

## ⚠️ Critical Finding: All User Data is in localStorage

**Regardless of user type (free, paid, BYOK), ALL user content is stored in browser localStorage:**

- ✅ **Projects:** `moonscribe-projects`
- ✅ **Project Content:** `moonscribe-project-content-${projectId}`
- ✅ **Insights:** `moonscribe_insights_v2`
- ✅ **Inbox:** `moonscribe-inbox`
- ✅ **Conversations:** `moonscribe-project-${projectId}-conversations`
- ✅ **API Keys:** `moonscribe-keys-${userId}` or `moonscribe-keys-anonymous`

**Only these are in Supabase:**
- ✅ User authentication (auth.users)
- ✅ Credits balance (credits table)
- ✅ Credit transactions (credit_transactions table)
- ✅ Team information (teams, team_members tables)
- ✅ Team API keys (encrypted in teams table)

**Only these are in Pinecone:**
- ✅ Vector embeddings (text chunks)
- ✅ Metadata (user_id, project_id, source filename)

---

## 🔍 What About "Own Drive"?

### Current Status: ❌ **NOT IMPLEMENTED**

**Evidence:**
1. **TODO.md** mentions "Google Drive import" as future feature
2. **Settings page** shows Google Drive option (UI only, no functionality)
3. **No code** for Google Drive API integration
4. **No code** for cloud storage sync
5. **ARCHITECTURE.md** says "Optional cloud sync (Supabase ready)" - but not implemented

### What R2/S3 Storage is For

The **Cloudflare R2 / AWS S3** storage mentioned in `DIRECT_STORAGE_UPLOAD_IMPLEMENTATION.md` is **ONLY for large file uploads** (>10MB), not for syncing user data:

- ✅ Large files uploaded to R2/S3 temporarily
- ✅ Files processed from storage
- ✅ Text extracted and stored in Pinecone
- ❌ **NOT used for syncing projects/insights/content**

---

## 🎯 Data Persistence Reality

### ✅ What IS Persistent:
1. **localStorage** - Persists until:
   - User clears browser data
   - Browser storage quota exceeded
   - Private/incognito mode (cleared on close)
   - Different browser/device (not synced)

2. **Supabase** - Persists:
   - User authentication
   - Credits balance
   - Team information
   - ✅ **Cross-device access** (for auth/credits only)

3. **Pinecone** - Persists:
   - Vector embeddings
   - ✅ **Cross-device access** (for search only)

### ❌ What is NOT Persistent Across Devices:
- ❌ Projects (localStorage only)
- ❌ Insights (localStorage only)
- ❌ Inbox content (localStorage only)
- ❌ Conversations (localStorage only)
- ❌ Personal API keys (localStorage only)

**Result:** If a user switches devices or clears browser data, they lose ALL their projects, insights, and content.

---

## 🚨 Critical Issues

### Issue 1: No Cloud Sync for Paid Users
**Problem:** Paid users' content is stored in localStorage, same as free users.

**Planned Behavior (From TODO.md & ARCHITECTURE.md):**
- ✅ Infrastructure ready: Supabase Storage configured
- ❌ Sync code not implemented: No actual sync functionality
- 📋 Planned: Optional cloud sync for paid users (localStorage primary, Supabase backup)
- 🎯 Strategy: Local-first with optional cloud sync (not mandatory)

**Current Impact:**
- Data lost if browser cleared
- No cross-device access
- No backup/recovery
- Matches documented "Local-First Philosophy" but lacks optional sync feature

**Note:** This is **intentional** per architecture (privacy-first), but the **optional sync for paid users** is planned but not implemented.

### Issue 2: "Own Drive" Not Implemented
**Problem:** Settings page shows "Google Drive" option, but it's just UI - no functionality.

**Impact:**
- Misleading to users
- Feature promised but not delivered

### Issue 3: VersionCheck Clearing Data
**Problem:** Fixed in this session, but was clearing localStorage on every reload.

**Impact:**
- Users lost data during development
- Now fixed to preserve data in dev mode

---

## 📋 Planned Storage Strategy (From Documentation)

### Planned Implementation: Optional Cloud Sync
**From TODO.md:** "Optional cloud sync (Supabase ready)" ✅ Infrastructure ready, ❌ Not implemented

**Planned Approach:**
- **Free Users:** localStorage only (no cloud sync) - matches current
- **Paid Users:** localStorage primary + optional Supabase Storage backup
- **BYOK Users:** localStorage primary + optional Supabase Storage backup
- **Strategy:** Local-first with optional cloud sync (user choice)

**Why This Approach (From ARCHITECTURE.md):**
1. **BYOK Consistent:** If we respect privacy for keys, we should for data too
2. **No account required:** Basic use works without sign-up
3. **Team-friendly:** Shared API key simplifies team onboarding
4. **Enterprise-safe:** Sensitive data controllable

**Current Status:**
- ✅ Supabase infrastructure configured
- ❌ Sync code not written
- 📋 Planned but not implemented

### Option B: Google Drive Integration
**For Users with "Own Drive":**
- Sync projects to Google Drive (as JSON files)
- Sync insights to Google Drive
- Use Google Drive API for read/write
- localStorage as cache

**Implementation Required:**
- Google Drive API integration
- OAuth flow for Google Drive access
- Sync logic (bidirectional)
- Conflict resolution

### Option C: Hybrid Approach
**For Paid Users:**
- Supabase Storage for automatic sync
- Optional Google Drive export/import
- localStorage as primary (with cloud backup)

---

## 🔧 Current Code Evidence

### Projects Storage (All User Types)
```typescript
// app/app/projects/page.tsx:50
const saved = localStorage.getItem('moonscribe-projects');

// app/app/projects/page.tsx:99
localStorage.setItem('moonscribe-projects', JSON.stringify(newProjects));
```

### Insights Storage (All User Types)
```typescript
// app/app/insights/page.tsx:139
const saved = localStorage.getItem(STORAGE_KEY); // 'moonscribe_insights_v2'

// app/app/insights/page.tsx:185
localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
```

### API Keys Storage (All User Types)
```typescript
// lib/utils/api-keys.ts:75
const key = userId ? `moonscribe-keys-${userId}` : 'moonscribe-keys-anonymous';
localStorage.setItem(key, JSON.stringify(updated));
```

**Conclusion:** No differentiation between free/paid users for content storage - all use localStorage.

---

## ✅ What Should Be Done

### Immediate (High Priority)
1. **Document the current reality** - Users should know data is localStorage-only
2. **Fix misleading UI** - Remove or clearly mark "Google Drive" as "Coming Soon"
3. **Add data export feature** - Let users export their data (JSON backup)

### Short-term (Medium Priority)
4. **Implement Supabase Storage sync for paid users**
   - Sync projects to Supabase Storage
   - Sync insights to Supabase Storage
   - Cross-device access
   - Automatic backup

### Long-term (Low Priority)
5. **Implement Google Drive integration**
   - OAuth flow
   - Sync to user's Google Drive
   - Bidirectional sync
   - Conflict resolution

---

## 📝 Conclusion

**Current Reality:**
- ✅ **ALL user types** (free, paid, BYOK) store content in **localStorage**
- ✅ Only auth, credits, and teams are in Supabase
- ❌ **No cloud sync** for user content (projects, insights, inbox)
- ❌ **"Own Drive" not implemented** (just UI placeholder)
- ⚠️ **Data is NOT persistent across devices** for any user type

**Planned Implementation (From Documentation):**
- ✅ **Infrastructure ready:** Supabase Storage configured ("Supabase ready" per TODO.md)
- ❌ **Sync not implemented:** No code written for cloud sync
- 📋 **Planned:** Optional cloud sync for paid users (localStorage primary, Supabase backup)
- 🎯 **Strategy:** Local-first philosophy with optional cloud sync (matches ARCHITECTURE.md)

**This matches the documented "Local-First Philosophy"** - the architecture intentionally keeps data local for privacy. The planned "optional cloud sync" for paid users is documented but not yet implemented.

---

**Last Updated:** January 2026  
**Status:** Current implementation documented - cloud sync not yet implemented
