# Resend Email Setup Instructions

**Purpose:** Set up Resend for sending team invitation emails

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Resend Account
1. Go to [resend.com](https://resend.com) and sign up (free tier available)
2. Complete account setup

### Step 2: Get API Key
1. Go to Resend Dashboard
2. Click **API Keys** in the sidebar
3. Click **Create API Key**
4. Name: `MoonScribe Team Invites`
5. Permission: **Sending access**
6. Click **Create**
7. **IMPORTANT:** Copy the API key immediately (starts with `re_`)

### Step 3: Verify Domain (Optional but Recommended)
For production, you should verify your domain:
1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `moonscribe.app`)
4. Add the DNS records provided by Resend
5. Wait for verification (usually a few minutes)

**For development/testing:** You can use Resend's default domain `onboarding@resend.dev` (limited to 100 emails/day)

### Step 4: Add Environment Variables

**For Local Development (.env.local):**
```env
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=MoonScribe <onboarding@resend.dev>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Vercel Production:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable:
   - `RESEND_API_KEY` = your Resend API key (starts with `re_`)
   - `RESEND_FROM_EMAIL` = `MoonScribe <onboarding@resend.dev>` (or your verified domain)
   - `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app`
3. Make sure to add to **Production**, **Preview**, and **Development** environments
4. Click **Save**

### Step 5: Install Resend Package

Run in your project directory:
```bash
npm install resend
```

---

## ✅ Verification

### Test the Setup:
1. Start your dev server: `npm run dev`
2. Go to Settings → Team tab
3. Create a team (if you don't have one)
4. Click **Invite Member**
5. Enter name and email
6. Click **Send Invitation**
7. Check the email inbox for the invitation

### Expected Behavior:
- ✅ Invitation email sent successfully
- ✅ Email contains team code
- ✅ Email contains join link with pre-filled code
- ✅ Clicking link opens settings page with team code pre-filled

---

## 📧 Email Template

The invitation email includes:
- Team name
- Team owner name
- **Team code** (highlighted)
- **Join link** (one-click join)
- Manual join instructions

---

## 🔒 Security Notes

1. **API Key Security:**
   - Never commit API key to git
   - Add `.env.local` to `.gitignore`
   - Use Vercel environment variables for production

2. **Email Validation:**
   - API validates email format before sending
   - Only team owners can send invitations
   - Invitations are rate-limited by Resend

3. **Join Link:**
   - Link includes team code in URL (not sensitive)
   - User still needs to sign in to join
   - Team code is validated server-side

---

## 💰 Cost Estimate

**Resend Pricing:**
- **Free Tier:** 3,000 emails/month, 100 emails/day
- **Pro:** $20/month for 50,000 emails
- **Pay-as-you-go:** $0.30 per 1,000 emails after free tier

**Example (100 team invites/month):**
- Well within free tier ✅
- **Cost: $0/month**

---

## 🐛 Troubleshooting

### Error: "Email service not configured"
- Check `RESEND_API_KEY` is set in environment variables
- Restart dev server after adding variables
- Verify variable name matches exactly (case-sensitive)

### Error: "Failed to send invitation email"
- Check Resend dashboard for error logs
- Verify API key is valid and has sending permissions
- Check if you've exceeded daily email limit (100/day on free tier)
- Verify `RESEND_FROM_EMAIL` is set correctly

### Email not received
- Check spam folder
- Verify email address is correct
- Check Resend dashboard → Logs for delivery status
- Free tier emails may have slight delays

### Join link doesn't work
- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check URL format: `https://your-app.vercel.app/app/settings?tab=team&teamCode=MOON-XXXX-XXXX`
- Ensure user is signed in before clicking link

---

## 📚 Next Steps

After setup:
1. ✅ Test sending an invitation
2. ✅ Verify email is received
3. ✅ Test join link functionality
4. ✅ Verify team code is pre-filled in join form

---

**Last Updated:** January 2026  
**Status:** Ready for setup
