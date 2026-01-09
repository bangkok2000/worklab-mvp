# MoonScribe - Development Roadmap

## 🎯 Phase 0: Quick Start Mode (Credits System)
**Goal:** Remove BYOK friction - let users start immediately

### Why This First?
- BYOK creates barrier to entry for 80% of users
- Students/researchers just want it to work
- Credits = transparent, no subscription lock-in
- Still offer BYOK for power users

### Credit System Design

#### Credit Costs
| Action | Credits | Approx. Real Cost |
|--------|---------|-------------------|
| Ask a question (GPT-3.5) | 1 credit | ~$0.002 |
| Ask a question (GPT-4) | 5 credits | ~$0.03 |
| Ask a question (Claude) | 3 credits | ~$0.015 |
| Upload document (per page) | 0.5 credits | ~$0.001 |
| Process YouTube video | 2 credits | ~$0.01 |
| Process web page | 1 credit | ~$0.005 |
| Transcribe audio (per min) | 2 credits | ~$0.006 |
| Export insight | 0 credits | Free |

#### Credit Packages
| Package | Credits | Price | Best For |
|---------|---------|-------|----------|
| **Starter** | 100 | Free (once) | Try it out |
| **Basic** | 500 | $5 | Light users |
| **Standard** | 1,500 | $12 | Regular users |
| **Pro** | 5,000 | $35 | Heavy users |
| **BYOK Mode** | ∞ | $0 | Power users (own keys) |

#### User Flow
```
New User Signs Up
       │
       ▼
┌──────────────────────────────────┐
│  🎉 Welcome! Here's 100 free     │
│     credits to get started.      │
│                                  │
│  [Start Using MoonScribe →]      │
└──────────────────────────────────┘
       │
       ▼
Uses credits naturally
       │
       ▼
Credits running low (< 20)
       │
       ▼
┌──────────────────────────────────┐
│  ⚡ Running low on credits       │
│                                  │
│  [Buy More Credits]              │
│  [Use Your Own API Key →]        │
└──────────────────────────────────┘
```

### Implementation Tasks

#### 0.1 Database Schema
- [ ] Create `credits` table (user_id, balance, created_at)
- [ ] Create `credit_transactions` table (user_id, amount, action, timestamp)
- [ ] Create `credit_packages` table (id, name, credits, price)
- [ ] Add credit balance to user profile

#### 0.2 Credit Tracking Service
- [ ] `deductCredits(userId, action, amount)` function
- [ ] `getBalance(userId)` function
- [ ] `addCredits(userId, amount, source)` function
- [ ] Pre-action balance check (fail gracefully)
- [ ] Transaction logging for audit

#### 0.3 Payment Integration (Stripe) ✅ CODE READY
- [x] Create checkout session API route
- [x] Webhook handler for payment completion
- [x] Client-side Stripe utilities
- [ ] Stripe account setup (see instructions below)
- [ ] Receipt/invoice generation
- [ ] Payment history page

##### Stripe Setup Instructions (Do When Ready)

**1. Create Stripe Account:**
- Go to [stripe.com](https://stripe.com) and sign up
- Complete business verification

**2. Get API Keys:**
- Go to Developers → API Keys
- Copy the keys (use test keys first!)

**3. Add Environment Variables:**
```env
# .env.local (local dev)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vercel (production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**4. Create Webhook Endpoint:**
- Go to Developers → Webhooks
- Add endpoint: `https://your-app.vercel.app/api/stripe/webhook`
- Select events:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- Copy the webhook secret (whsec_...)

**5. Create Products in Stripe Dashboard:**
- Products → Add Product
- Create products for each credit package:
  - Basic (500 credits) - $5.00
  - Standard (1500 credits) - $12.00
  - Pro (5000 credits) - $35.00
- Copy the Price IDs and update `credit_packages` table in Supabase

**6. Test with Stripe CLI (optional but recommended):**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Test payment
stripe trigger checkout.session.completed
```

#### 0.4 Server-Side AI
- [ ] MoonScribe OpenAI account setup
- [ ] Server-side API key (env variable)
- [ ] Rate limiting per user
- [ ] Fallback handling (API errors)
- [ ] Cost monitoring dashboard (internal)

#### 0.5 UI Components
- [ ] Credit balance display in header
- [ ] "Buy Credits" modal
- [ ] Credit usage breakdown page
- [ ] Low balance warning
- [ ] BYOK vs Credits toggle in Settings
- [ ] Action cost tooltips ("This will use 1 credit")

#### 0.6 Authentication ✅ COMPLETE
- [x] Supabase Auth setup
- [x] Sign up page (email + password)
- [x] Sign in page
- [x] Email verification flow
- [x] Session management
- [x] Protected routes (redirect if not logged in)
- [x] "Continue as Guest" option (limited features, no credits)
- [ ] OAuth providers (Google, GitHub) - See setup instructions below
- [ ] Password reset flow
- [ ] User profile page

##### OAuth Setup Instructions (Do Later)

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials (Web application)
3. Add authorized redirect URI: `https://YOUR_SUPABASE_URL/auth/v1/callback`
4. Copy Client ID and Client Secret
5. In Supabase Dashboard → Authentication → Providers → Google:
   - Enable Google provider
   - Paste Client ID and Client Secret
   - Save

**GitHub OAuth:**
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Set Homepage URL: `https://your-app-url.com`
4. Set Authorization callback URL: `https://YOUR_SUPABASE_URL/auth/v1/callback`
5. Copy Client ID and Client Secret
6. In Supabase Dashboard → Authentication → Providers → GitHub:
   - Enable GitHub provider
   - Paste Client ID and Client Secret
   - Save

**After enabling in Supabase:**
- OAuth buttons already work in the app
- Users click "Continue with Google/GitHub" → Supabase handles the flow

#### 0.7 Mode Switching
- [ ] Settings: Choose "MoonScribe AI" or "BYOK"
- [ ] Seamless switching between modes
- [ ] BYOK users skip credit checks
- [ ] Clear indication of current mode

**Effort:** 7-10 days total (Auth: 3-4 days, Credits: 4-6 days)

### Build Order for Phase 0
```
Step 1: Auth (Days 1-4)
   └── Users can sign up/in
        │
Step 2: Credits DB + Service (Days 5-7)
   └── Track credits per user
        │
Step 3: Stripe + UI (Days 8-10)
   └── Buy credits, see balance
        │
Step 4: Server AI (Days 10-12)
   └── Use credits for queries
```

---

## 📊 Competitive Status

### ✅ Our Advantages (Keep & Strengthen)
- [x] BYOK (Bring Your Own Key) - **Unique differentiator**
- [x] Local-first data storage - **Privacy focused**
- [x] Multi-provider support (OpenAI, Anthropic, Google, Ollama)
- [x] PDF processing with RAG
- [x] Project-based organization
- [x] Insights management with export
- [x] No subscription lock-in

### 🔴 Competitive Gaps (Must Close)
| Gap | Competitors Have | Our Status | Priority |
|-----|------------------|------------|----------|
| YouTube processing | NotebookLM, Recall | UI only | **P0** |
| Web page scraping | Everyone | UI only | **P0** |
| Audio/podcast transcription | NotebookLM, Recall | Not started | **P1** |
| Browser extension | Recall, Mem | Not started | **P1** |
| Better RAG quality | All (tuned) | Basic | **P1** |
| Mobile access | Most have apps | Web only | **P2** |
| Real-time collaboration | Notion, Mem | UI mockup | **P2** |
| User onboarding | All | None | **P2** |

---

## 🚀 Phase 1: Close Critical Gaps (P0)
**Goal:** Match table-stakes features competitors have

### 1.1 YouTube Processor ⏳
- [ ] Extract video ID from YouTube URLs
- [ ] Fetch transcript via YouTube API / youtube-transcript library
- [ ] Handle videos without transcripts (show error)
- [ ] Chunk transcript with timestamps
- [ ] Store in Pinecone with video metadata
- [ ] Display video thumbnail in library
- [ ] Link citations to timestamp in video

**Effort:** 3-4 days

### 1.2 Web Page Scraper ⏳
- [ ] URL validation and sanitization
- [ ] Fetch page content (handle SPAs with puppeteer/playwright)
- [ ] Extract main content (readability algorithm)
- [ ] Remove ads, navigation, footers
- [ ] Preserve headings and structure
- [ ] Handle paywalls gracefully (show error)
- [ ] Store page snapshot with metadata

**Effort:** 4-5 days

### 1.3 Authentication (Required for Cloud Sync)
- [ ] Supabase Auth UI (login/signup)
- [ ] Email verification flow
- [ ] Password reset
- [ ] Session management
- [ ] Protected routes
- [ ] Optional: OAuth (Google, GitHub)

**Effort:** 3-4 days

---

## 🔧 Phase 2: Quality & Experience (P1)
**Goal:** Better than basic, approaching competitive quality

### 2.1 Audio/Podcast Transcription
- [ ] Audio file upload (MP3, WAV, M4A)
- [ ] Integration with Whisper API (OpenAI)
- [ ] Or: AssemblyAI / Deepgram for better accuracy
- [ ] Speaker diarization (who said what)
- [ ] Timestamp-linked citations
- [ ] Podcast RSS feed import

**Effort:** 4-5 days

### 2.2 Browser Extension (Chrome/Firefox)
- [ ] 1-click capture current page
- [ ] Highlight & save selections
- [ ] Quick note popup
- [ ] Save to Inbox or Project
- [ ] Keyboard shortcut (Cmd+Shift+M)
- [ ] Sync with main app

**Effort:** 5-7 days

### 2.3 Hybrid RAG (Better Answers)
- [ ] Enable sparse vectors in Pinecone
- [ ] Implement BM25 for keyword matching
- [ ] Hybrid search (dense + sparse)
- [ ] Cross-encoder reranking
- [ ] LLM-based query expansion
- [ ] Context window optimization
- [ ] Answer quality metrics

**Effort:** 5-6 days

### 2.4 Rich Note Editor
- [ ] Markdown support with preview
- [ ] Slash commands (/ for actions)
- [ ] @mention documents/insights
- [ ] Inline AI assistance
- [ ] Auto-save
- [ ] Version history

**Effort:** 4-5 days

---

## 📱 Phase 3: Scale & Polish (P2)
**Goal:** Production-ready, competitive experience

### 3.1 Mobile PWA
- [ ] Responsive design audit
- [ ] PWA manifest & service worker
- [ ] Offline read access
- [ ] Mobile-optimized chat interface
- [ ] Touch-friendly interactions
- [ ] Install prompts

**Effort:** 4-5 days

### 3.2 Real Collaboration
- [ ] Invite team members (email)
- [ ] Role-based permissions (owner, editor, viewer)
- [ ] Shared projects
- [ ] Activity feed
- [ ] Comments on insights
- [ ] Real-time presence (who's viewing)

**Effort:** 7-10 days

### 3.3 Integrations
- [ ] Export to Notion
- [ ] Export to Obsidian
- [ ] Google Drive import
- [ ] Zapier/Make webhooks
- [ ] API for developers

**Effort:** 5-7 days

### 3.4 Onboarding & Polish
- [ ] First-run tutorial
- [ ] Sample project with demo content
- [ ] Tooltips and hints
- [ ] Empty state guidance
- [ ] Error messages that help
- [ ] Loading state polish

**Effort:** 3-4 days

---

## ✅ Completed Features

### Core Platform
- [x] Three-panel layout (Sources | Chat | History)
- [x] PDF upload and processing
- [x] RAG-based Q&A with citations
- [x] Semantic chunking (paragraph/sentence aware)
- [x] Query expansion (basic)

### BYOK Implementation
- [x] API key management UI
- [x] Client-side encryption (AES-GCM)
- [x] Multi-provider support
- [x] Model selection per request
- [x] Key validation and testing

### Data & Privacy
- [x] Local-first storage (localStorage/IndexedDB)
- [x] Data & Privacy settings page
- [x] Transparent data location display
- [x] Optional cloud sync (Supabase ready)

### Organization
- [x] Project-based organization
- [x] Inbox for quick capture
- [x] Chat history persistence
- [x] Document search/filter

### Insights
- [x] Save AI answers as insights
- [x] Original query tracking
- [x] Source references with relevance
- [x] Export options (PDF, Markdown, Word)
- [x] Filter by project/tag/starred

### UI Framework
- [x] Dashboard with stats
- [x] Library pages (Documents, Media, Web, Notes)
- [x] Settings with all tabs
- [x] Team page (UI only)
- [x] Integrations page (UI only)

---

## 📈 Success Metrics

### Phase 1 Success
- [ ] Can process YouTube videos end-to-end
- [ ] Can capture and search web pages
- [ ] Users can create accounts and sync

### Phase 2 Success
- [ ] Answer quality improved (measure with test set)
- [ ] Browser extension has 100+ installs
- [ ] Audio content searchable

### Phase 3 Success
- [ ] Mobile traffic > 20% of usage
- [ ] Teams with 3+ members active
- [ ] Integration exports working

---

## 🗓️ Rough Timeline

| Phase | Duration | Target |
|-------|----------|--------|
| **Phase 0** | 1-2 weeks | Credits system + Auth (remove friction) |
| Phase 1 | 2-3 weeks | Content processors (YouTube, Web) |
| Phase 2 | 3-4 weeks | Quality + Extensions |
| Phase 3 | 4-6 weeks | Scale + Polish |

**Total to v1.0:** ~12-14 weeks

### Recommended Build Order
```
Week 1-2:   [████████] Credits System + Stripe + Auth
                       ↓
Week 3-5:   [████████████] YouTube + Web Processor
                       ↓
Week 6-9:   [████████████████] Audio + Browser Extension + RAG
                       ↓
Week 10-14: [████████████████████] Mobile + Collab + Polish
            ─────────────────────────────────────────────────►
                                                         v1.0
```

---

*Last Updated: After competitive analysis review*
