# File Upload Size Limit - Solution Guide

**Issue:** Application allows up to 100MB uploads, but Next.js/Vercel blocks at ~4.5MB  
**Priority:** High  
**Status:** Solution documented, implementation pending

---

## 🔍 Problem Analysis

### Current Limits

| Layer | Limit | Notes |
|-------|-------|-------|
| **Application Code** | 100MB (PDF/Audio), 20MB (Images) | Set in code |
| **Next.js 14 App Router** | 1MB default | Cannot override in next.config.js for App Router |
| **Vercel Serverless Functions** | ~4.5MB hard limit | Cannot be changed via code |
| **Vercel Pro Plan** | Up to 4.5GB | Configurable in project settings |

### The Mismatch

```
User sees: "Upload up to 100MB" in UI
           ↓
Client validation: ✅ Passes (file < 100MB)
           ↓
Upload to API route
           ↓
Vercel/Next.js: ❌ Blocks at 4.5MB
           ↓
Error: "message length too large: found 4725670 bytes, limit is: 4194304 bytes"
```

---

## ✅ Solutions (Ranked by Ease)

### Solution 1: Increase Vercel Body Size Limit (Easiest - Short-term)

**For Vercel Deployments:**

1. **Go to Vercel Dashboard:**
   - Navigate to your project
   - Go to **Settings** → **Functions**

2. **Increase Max Request Body Size:**
   - Find "Max Request Body Size" setting
   - Change from default (4.5MB) to desired limit:
     - **Free/Hobby:** Up to 4.5MB (hard limit)
     - **Pro Plan:** Up to 4.5GB
     - **Enterprise:** Custom limits

3. **Redeploy:**
   - Changes take effect after next deployment
   - No code changes needed

**Pros:**
- ✅ No code changes required
- ✅ Works immediately after redeploy
- ✅ Supports up to 4.5GB on Pro plan

**Cons:**
- ❌ Limited to 4.5MB on Free/Hobby plan
- ❌ Still goes through serverless function (slower for large files)
- ❌ Uses more serverless function execution time

**Recommended Limit:**
- **Free/Hobby:** Keep at 4.5MB (hard limit)
- **Pro Plan:** Set to 100MB (matches application code)
- **Enterprise:** Set to 4.5GB (maximum)

---

### Solution 2: Direct-to-Storage Uploads (Best - Long-term)

**Architecture:**
```
Client → Generate Pre-signed URL → Upload to S3/R2 → Process from Storage
```

**Implementation Steps:**

1. **Set up Storage Service:**
   - AWS S3, Cloudflare R2, or similar
   - Create bucket for uploads
   - Configure CORS for browser uploads

2. **Create Pre-signed URL API:**
   ```typescript
   // app/api/upload/presigned-url/route.ts
   export async function POST(req: NextRequest) {
     // Generate pre-signed URL for direct upload
     // Return URL to client
   }
   ```

3. **Client Upload Flow:**
   ```typescript
   // 1. Request pre-signed URL
   const { uploadUrl, fileId } = await fetch('/api/upload/presigned-url', {
     method: 'POST',
     body: JSON.stringify({ filename, fileType, fileSize })
   });
   
   // 2. Upload directly to storage
   await fetch(uploadUrl, {
     method: 'PUT',
     body: file,
     headers: { 'Content-Type': file.type }
   });
   
   // 3. Notify API to process
   await fetch('/api/upload/process', {
     method: 'POST',
     body: JSON.stringify({ fileId, projectId })
   });
   ```

4. **Process from Storage:**
   ```typescript
   // app/api/upload/process/route.ts
   export async function POST(req: NextRequest) {
     // Download from storage
     // Process file (PDF, audio, etc.)
     // Store in Pinecone
   }
   ```

**Pros:**
- ✅ Bypasses serverless function limits
- ✅ Faster uploads (direct to storage)
- ✅ More scalable
- ✅ Works for any file size
- ✅ Better user experience (progress tracking)

**Cons:**
- ❌ Requires storage service setup
- ❌ More complex implementation
- ❌ Additional costs (storage + bandwidth)

**Recommended For:**
- Files > 10MB
- Production deployments
- High-volume usage

---

### Solution 3: Chunked Uploads (Complex - Not Recommended)

**How it works:**
- Split file into chunks (e.g., 4MB each)
- Upload chunks sequentially
- Reassemble on server

**Pros:**
- ✅ Works with current infrastructure
- ✅ No storage service needed

**Cons:**
- ❌ Complex implementation
- ❌ Slower (sequential uploads)
- ❌ More error-prone
- ❌ Not ideal for large files

**Recommendation:** ❌ Not recommended - Use Solution 2 instead

---

## 🎯 Recommended Approach

### Phase 1: Immediate Fix (This Week)
1. **Update Vercel Settings:**
   - Increase "Max Request Body Size" to 100MB (Pro plan)
   - Or keep at 4.5MB and update UI to reflect actual limit

2. **Update UI Messages:**
   - Show actual limits based on plan
   - Warn users about platform limits
   - Provide clear error messages

### Phase 2: Long-term Solution (Next Month)
1. **Implement Direct-to-Storage:**
   - Set up S3/R2 bucket
   - Create pre-signed URL API
   - Update client upload flow
   - Process files from storage

2. **Migrate Large File Handling:**
   - Files > 10MB → Direct to storage
   - Files < 10MB → Current flow (faster)

---

## 📝 Implementation Checklist

### Immediate (Vercel Settings):
- [ ] Go to Vercel Dashboard → Settings → Functions
- [ ] Increase "Max Request Body Size" to 100MB (Pro) or 4.5MB (Free)
- [ ] Redeploy application
- [ ] Test file uploads at new limit

### UI Updates:
- [ ] Update error messages to reflect actual limits
- [ ] Show different limits for Free vs Pro plans
- [ ] Add warning for files approaching limit
- [ ] Update "up to 100MB" text to match actual limit

### Long-term (Direct-to-Storage):
- [ ] Set up storage service (S3/R2)
- [ ] Create pre-signed URL API route
- [ ] Create process-from-storage API route
- [ ] Update client upload flow
- [ ] Add progress tracking
- [ ] Test with large files (>10MB)
- [ ] Update documentation

---

## 🔧 Code Changes Needed

### 1. Update Error Messages

**File:** `app/components/layout/AppShell.tsx`

```typescript
// Update max size labels to reflect actual limits
const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100MB (intended)
const ACTUAL_PDF_LIMIT = 4.5 * 1024 * 1024; // 4.5MB (Vercel limit on Free/Hobby)

// Show actual limit in UI
maxSizeLabel = '4.5MB (Vercel limit) - Upgrade to Pro for 100MB';
```

### 2. Add Plan Detection

```typescript
// Detect if user is on Pro plan (via environment or API)
const isProPlan = process.env.VERCEL_PLAN === 'pro' || await checkPlan();

// Show appropriate limits
const maxSize = isProPlan ? 100 * 1024 * 1024 : 4.5 * 1024 * 1024;
```

### 3. Update Documentation

- Update `INSTRUCTIONS.md` with actual limits
- Add note about Vercel configuration
- Document direct-to-storage future plan

---

## 📊 Cost Analysis

### Vercel Pro Plan:
- **Cost:** $20/month per user
- **Benefit:** Up to 4.5GB uploads
- **ROI:** Worth it if users need large file uploads

### Direct-to-Storage (S3 Example):
- **Storage:** $0.023/GB/month
- **Bandwidth:** $0.09/GB (first 10TB)
- **Requests:** $0.005 per 1,000 requests
- **Estimated:** $5-10/month for moderate usage

**Recommendation:** Start with Vercel Pro upgrade, migrate to direct-to-storage if costs grow.

---

## 🚀 Next Steps

1. **Today:** Update Vercel settings and UI messages
2. **This Week:** Test uploads at new limits
3. **Next Month:** Plan direct-to-storage implementation
4. **Future:** Migrate large files to direct-to-storage

---

**Last Updated:** January 2025  
**Status:** Solution documented, ready for implementation
