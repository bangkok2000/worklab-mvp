# Cloudflare R2 Storage Setup Instructions

**Purpose:** Set up Cloudflare R2 for direct-to-storage file uploads (bypasses Vercel 4.5MB limit)

---

## 🚀 Quick Setup (10 minutes)

### Step 1: Create Cloudflare Account
1. Go to [cloudflare.com](https://cloudflare.com) and sign up (free)
2. Complete account setup

### Step 2: Enable R2
1. Go to Cloudflare Dashboard
2. Click **R2** in the left sidebar
3. Click **Create bucket**
4. Name: `moonscribe-uploads` (or your preferred name)
5. Location: Choose closest to your users
6. Click **Create bucket**

### Step 3: Create API Token
1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Name: `MoonScribe Upload Token`
4. Permissions: **Object Read & Write**
5. TTL: **Never expire** (or set custom expiry)
6. Click **Create API token**
7. **IMPORTANT:** Copy these values immediately (you won't see them again):
   - **Access Key ID**
   - **Secret Access Key**

### Step 4: Get Account ID
1. In Cloudflare Dashboard, go to any page
2. Look at the URL or sidebar - your **Account ID** is visible
3. Copy the Account ID (looks like: `abc123def456...`)

### Step 5: Configure CORS (Optional but Recommended)
1. In R2 dashboard, select your bucket
2. Go to **Settings** tab
3. Scroll to **CORS Policy**
4. Add this CORS configuration:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
5. Click **Save**

### Step 6: Add Environment Variables

**For Local Development (.env.local):**
```env
# Cloudflare R2 Storage
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=moonscribe-uploads
```

**For Vercel Production:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable:
   - `R2_ACCOUNT_ID` = your account ID
   - `R2_ACCESS_KEY_ID` = your access key ID
   - `R2_SECRET_ACCESS_KEY` = your secret access key
   - `R2_BUCKET_NAME` = `moonscribe-uploads`
3. Make sure to add to **Production**, **Preview**, and **Development** environments
4. Click **Save**

### Step 7: Install Required Packages

Run in your project directory:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid
npm install --save-dev @types/uuid
```

---

## ✅ Verification

### Test the Setup:
1. Start your dev server: `npm run dev`
2. Try uploading a file >10MB
3. Check browser console for any errors
4. Check Cloudflare R2 bucket - you should see uploaded files

### Expected Behavior:
- Files <10MB: Upload directly to API (faster)
- Files >10MB: Upload to R2 storage, then process
- Progress messages should show: "Preparing upload..." → "Uploading to storage..." → "Processing file..."

---

## 🔒 Security Notes

1. **Never commit API keys to git**
   - Add `.env.local` to `.gitignore`
   - Use Vercel environment variables for production

2. **Rotate keys periodically**
   - Create new API token
   - Update environment variables
   - Delete old token

3. **Limit permissions**
   - Use "Object Read & Write" only (not bucket admin)
   - Restrict to specific bucket if possible

---

## 💰 Cost Estimate

**Cloudflare R2 Pricing:**
- **Storage:** $0.015/GB/month
- **Operations:** $4.50 per million Class A operations
- **Egress:** FREE (unlimited)

**Example (1000 users, 10GB storage, 10K uploads/month):**
- Storage: 10GB × $0.015 = **$0.15/month**
- Operations: 10K × $4.50/1M = **$0.045/month**
- **Total: ~$0.20/month** ✅

---

## 🐛 Troubleshooting

### Error: "R2 storage not configured"
- Check environment variables are set correctly
- Restart dev server after adding variables
- Verify variable names match exactly (case-sensitive)

### Error: "Upload to storage failed"
- Check CORS configuration in R2 bucket
- Verify API token has correct permissions
- Check bucket name matches `R2_BUCKET_NAME`

### Error: "Failed to generate upload URL"
- Verify Account ID is correct
- Check Access Key ID and Secret Access Key are valid
- Ensure bucket exists and is accessible

---

## 📚 Next Steps

After setup:
1. ✅ Test with small file (<10MB) - should use direct upload
2. ✅ Test with large file (>10MB) - should use storage upload
3. ✅ Verify files appear in R2 bucket
4. ✅ Check processing completes successfully

---

**Last Updated:** January 2025  
**Status:** Ready for setup
