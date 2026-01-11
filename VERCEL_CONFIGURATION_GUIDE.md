# Vercel Configuration Guide - Quick Fix for Large File Uploads

**Purpose:** Increase Vercel body size limit to support larger file uploads (up to 4.5GB on Pro plan)

---

## 🚀 Quick Steps (5 minutes)

### Step 1: Access Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and sign in
2. Navigate to your MoonScribe project

### Step 2: Open Settings
1. Click on your project name
2. Go to **Settings** tab (in the top navigation)
3. Click on **Functions** in the left sidebar

### Step 3: Increase Body Size Limit
1. Find **"Max Request Body Size"** setting
2. Current value: `4.5 MB` (default)
3. Change to:
   - **Free/Hobby Plan:** Keep at `4.5 MB` (hard limit, cannot increase)
   - **Pro Plan:** Set to `100 MB` (matches your application code)
   - **Enterprise Plan:** Set to `4.5 GB` (maximum)

### Step 4: Save and Redeploy
1. Click **Save** button
2. Go to **Deployments** tab
3. Click **Redeploy** on the latest deployment
   - OR push a new commit to trigger automatic deployment

### Step 5: Verify
1. Wait for deployment to complete (~2-3 minutes)
2. Test uploading a file >4.5MB
3. Should now work up to your configured limit

---

## 📊 Plan Comparison

| Plan | Max Body Size | Cost | Recommendation |
|------|---------------|------|----------------|
| **Free/Hobby** | 4.5 MB (hard limit) | $0 | Cannot increase - use direct-to-storage |
| **Pro** | Up to 4.5 GB | $20/user/month | Set to 100 MB (matches app code) |
| **Enterprise** | Custom (up to 4.5 GB) | Custom | Set to 4.5 GB (maximum) |

---

## ⚠️ Important Notes

1. **Free/Hobby Plan:**
   - Cannot increase beyond 4.5 MB
   - Must use direct-to-storage solution for larger files
   - See `DIRECT_STORAGE_UPLOAD_IMPLEMENTATION.md`

2. **Pro Plan:**
   - Can increase up to 4.5 GB
   - Recommended: Set to 100 MB (matches your application limits)
   - Still uses serverless function execution time (slower for very large files)

3. **After Configuration:**
   - Changes take effect after next deployment
   - No code changes needed
   - Works immediately for all API routes

---

## 🔍 How to Check Your Current Plan

1. Go to Vercel Dashboard
2. Click on your **Team/Account** (top right)
3. Go to **Settings** → **Billing**
4. Check your current plan

---

## ✅ Verification Checklist

After configuration:
- [ ] Settings saved successfully
- [ ] Project redeployed
- [ ] Test upload with 5MB file (should work)
- [ ] Test upload with 50MB file (should work on Pro)
- [ ] Check error messages are accurate

---

## 🎯 Next Steps

After configuring Vercel:
1. ✅ Test uploads work at new limit
2. ✅ Update UI to reflect actual limit (already done)
3. 🔄 Implement direct-to-storage for production (next phase)

---

**Last Updated:** January 2025  
**Status:** Ready for configuration
