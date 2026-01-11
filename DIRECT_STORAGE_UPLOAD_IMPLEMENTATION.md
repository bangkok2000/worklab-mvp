# Direct-to-Storage Upload Implementation Plan

**Goal:** Implement direct-to-storage uploads for large files (>10MB) to bypass Vercel serverless function limits.

---

## 🎯 Recommended Approach

### Why Direct-to-Storage?

1. **No Size Limits** - Upload files of any size (100MB, 1GB, etc.)
2. **Faster Uploads** - Direct client-to-storage (no serverless function bottleneck)
3. **Better UX** - Real-time progress tracking
4. **Cost Effective** - Storage costs are minimal (~$0.023/GB/month)
5. **Scalable** - Handles high-volume uploads efficiently
6. **Professional** - Industry-standard approach (used by Dropbox, Google Drive, etc.)

---

## 🏗️ Architecture

```
┌─────────┐
│ Client  │
└────┬────┘
     │ 1. Request pre-signed URL
     │    POST /api/upload/presigned-url
     ▼
┌─────────────────┐
│ Next.js API     │
│ (Serverless)    │
└────┬────────────┘
     │ 2. Generate pre-signed URL
     │    (S3/R2 credentials)
     ▼
┌─────────────┐
│ S3/R2       │
│ Storage     │
└─────────────┘
     │ 3. Return pre-signed URL
     ▼
┌─────────┐
│ Client  │
└────┬────┘
     │ 4. Upload file directly
     │    PUT to pre-signed URL
     ▼
┌─────────────┐
│ S3/R2       │
│ Storage     │
└────┬────────┘
     │ 5. Notify processing
     │    POST /api/upload/process
     ▼
┌─────────────────┐
│ Next.js API     │
│ (Downloads from│
│  storage)       │
└────┬────────────┘
     │ 6. Process file
     │    (PDF parsing, audio transcription, etc.)
     ▼
┌─────────────┐
│ Pinecone    │
│ (Embeddings)│
└─────────────┘
```

---

## 📦 Storage Service Options

### Option 1: Cloudflare R2 (Recommended)

**Pros:**
- ✅ No egress fees (unlike S3)
- ✅ S3-compatible API
- ✅ Generous free tier (10GB storage, 1M requests/month)
- ✅ Fast global CDN
- ✅ Simple pricing

**Pricing:**
- Storage: $0.015/GB/month
- Operations: $4.50 per million Class A operations
- Egress: FREE (unlimited)

**Setup:**
1. Create Cloudflare account
2. Go to R2 → Create bucket
3. Get API token (Account ID, Access Key ID, Secret Access Key)

### Option 2: AWS S3

**Pros:**
- ✅ Industry standard
- ✅ Mature ecosystem
- ✅ Good documentation

**Cons:**
- ❌ Egress fees ($0.09/GB)
- ❌ More complex setup

**Pricing:**
- Storage: $0.023/GB/month
- Requests: $0.005 per 1,000 requests
- Egress: $0.09/GB (first 10TB)

### Option 3: Supabase Storage

**Pros:**
- ✅ Already using Supabase
- ✅ Integrated with existing auth
- ✅ Simple setup

**Cons:**
- ❌ Smaller free tier (1GB)
- ❌ Less flexible than S3/R2

**Pricing:**
- Free: 1GB storage
- Pro: $0.021/GB/month

---

## 🚀 Implementation Steps

### Step 1: Set Up Storage Service

**For Cloudflare R2:**
```bash
# Install AWS SDK (R2 is S3-compatible)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Environment Variables:**
```env
# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=moonscribe-uploads
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
```

### Step 2: Create Pre-signed URL API

**File:** `app/api/upload/presigned-url/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createServerClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { filename, fileType, fileSize, projectId } = await req.json();
    
    // Validate file size
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (fileSize > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }
    
    // Get user (optional - for authenticated uploads)
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }
    
    // Generate unique file ID
    const fileId = uuidv4();
    const key = userId ? `uploads/${userId}/${fileId}/${filename}` : `uploads/anonymous/${fileId}/${filename}`;
    
    // Create pre-signed URL (valid for 1 hour)
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: fileType,
      Metadata: {
        originalFilename: filename,
        fileSize: fileSize.toString(),
        projectId: projectId || '',
        userId: userId || 'anonymous',
      },
    });
    
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return NextResponse.json({
      uploadUrl,
      fileId,
      key,
    });
  } catch (error) {
    console.error('[Presigned URL] Error:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
```

### Step 3: Create Process-from-Storage API

**File:** `app/api/upload/process/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createServerClient } from '@/lib/supabase/client';
// ... other imports from existing upload route

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { fileId, key, projectId, apiKey } = await req.json();
    
    // Download file from storage
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    const buffer = await response.Body!.transformToByteArray();
    const fileBuffer = Buffer.from(buffer);
    
    // Get file metadata
    const metadata = response.Metadata || {};
    const filename = metadata.originalFilename || 'file';
    const fileType = response.ContentType || 'application/pdf';
    
    // Create File-like object
    const file = new File([fileBuffer], filename, { type: fileType });
    
    // Process file (reuse existing logic from /api/upload/route.ts)
    // - PDF parsing
    // - Audio transcription
    // - Image processing
    // - Embedding generation
    // - Pinecone storage
    
    // ... (reuse processing logic from existing routes)
    
    return NextResponse.json({ success: true, documentId });
  } catch (error) {
    console.error('[Process Upload] Error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
```

### Step 4: Update Client Upload Flow

**File:** `app/components/layout/AppShell.tsx`

```typescript
const handleFileUpload = async (file: File) => {
  setIsProcessing(true);
  setError('');
  setProcessingStatus('Preparing upload...');
  
  const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
  
  try {
    const apiKey = await getApiKey();
    
    // For large files, use direct-to-storage
    if (file.size > LARGE_FILE_THRESHOLD) {
      // 1. Get pre-signed URL
      setProcessingStatus('Getting upload URL...');
      const presignedResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
          projectId: selectedProject !== 'inbox' ? selectedProject : null,
        }),
      });
      
      if (!presignedResponse.ok) {
        throw new Error('Failed to get upload URL');
      }
      
      const { uploadUrl, fileId, key } = await presignedResponse.json();
      
      // 2. Upload directly to storage with progress
      setProcessingStatus('Uploading to storage...');
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }
      
      // 3. Notify API to process
      setProcessingStatus('Processing file...');
      const processResponse = await fetch('/api/upload/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          key,
          projectId: selectedProject !== 'inbox' ? selectedProject : null,
          apiKey,
        }),
      });
      
      if (!processResponse.ok) {
        const error = await processResponse.json();
        throw new Error(error.error || 'Processing failed');
      }
      
      const data = await processResponse.json();
      // Handle success...
    } else {
      // For small files, use existing direct upload flow
      // ... (existing code)
    }
  } catch (error) {
    setError(error.message || 'Upload failed');
    setIsProcessing(false);
  }
};
```

---

## 📋 Implementation Checklist

### Phase 1: Setup (Day 1)
- [ ] Choose storage service (recommend Cloudflare R2)
- [ ] Create storage bucket
- [ ] Get API credentials
- [ ] Add environment variables
- [ ] Install required packages (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `uuid`)

### Phase 2: Backend APIs (Day 2-3)
- [ ] Create `/api/upload/presigned-url/route.ts`
- [ ] Create `/api/upload/process/route.ts`
- [ ] Reuse processing logic from existing routes
- [ ] Add error handling
- [ ] Test with sample files

### Phase 3: Client Integration (Day 4)
- [ ] Update `AppShell.tsx` upload handler
- [ ] Add progress tracking for large files
- [ ] Update error messages
- [ ] Test upload flow end-to-end

### Phase 4: Testing & Polish (Day 5)
- [ ] Test with various file sizes (10MB, 50MB, 100MB)
- [ ] Test with different file types (PDF, audio, images)
- [ ] Test error scenarios
- [ ] Update UI messages
- [ ] Document the new flow

---

## 💰 Cost Estimation

### Cloudflare R2 (Recommended)
**For 1000 users, 10GB total storage, 10K uploads/month:**
- Storage: 10GB × $0.015 = **$0.15/month**
- Operations: 10K × $4.50/1M = **$0.045/month**
- Egress: **FREE**
- **Total: ~$0.20/month** ✅

### AWS S3 (Alternative)
**Same usage:**
- Storage: 10GB × $0.023 = **$0.23/month**
- Requests: 10K × $0.005/1K = **$0.05/month**
- Egress: ~5GB × $0.09 = **$0.45/month**
- **Total: ~$0.73/month**

**Recommendation:** Cloudflare R2 is cheaper and simpler.

---

## 🎯 Migration Strategy

### Gradual Rollout:
1. **Week 1:** Implement for files >10MB only
2. **Week 2:** Test with beta users
3. **Week 3:** Roll out to all users
4. **Week 4:** Consider migrating all files to storage (optional)

### Backward Compatibility:
- Keep existing direct upload for files <10MB (faster for small files)
- Large files automatically use storage
- No breaking changes for users

---

## 🔒 Security Considerations

1. **Pre-signed URLs:**
   - Expire after 1 hour
   - Include file metadata (size, type) in signature
   - Validate on server before processing

2. **Access Control:**
   - Store files in user-specific folders
   - Validate user authentication
   - Check file ownership before processing

3. **File Validation:**
   - Validate file type and size
   - Scan for malware (optional, future)
   - Rate limit uploads per user

---

## 📚 Next Steps

1. **Choose storage service** (recommend Cloudflare R2)
2. **Set up bucket and credentials**
3. **Implement pre-signed URL API
4. **Implement process-from-storage API**
5. **Update client upload flow**
6. **Test and deploy**

---

**Ready to implement?** I can help you set this up step-by-step!
