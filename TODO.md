# MoonScribe - Development Roadmap

## 🐛 Known Bugs (High Priority)

### Bug 1: QuickCaptureModal not using BYOK key ✅ FIXED
- **Status:** ✅ **VERIFIED FIXED** (See BUG_STATUS_REPORT.md)
- **Issue:** "Add Content" modal shows "Please sign in to use credits, add your own API key, or join a team" even when BYOK key is configured and active
- **Root Cause:** QuickCaptureModal's `getApiKey()` function reads from wrong localStorage key
- **Fix Applied:** QuickCaptureModal now uses `getDecryptedApiKey()` which correctly reads from `moonscribe-keys-anonymous` or `moonscribe-keys-${userId}`
- **Verification:** Code review confirms correct localStorage key usage in `lib/utils/api-keys.ts`

### Bug 2: Project page returns 404
- **Issue:** After creating a new project, clicking on it navigates to `/app/projects/project-{id}` which returns 404
- **Root Cause:** Dynamic route `/app/projects/[projectId]/page.tsx` may not exist or has wrong path
- **Fix:** Verify the dynamic route exists and matches the navigation URL

### Bug 3: Old version of app appearing (cache issue?)
- **Issue:** Sometimes the old UI appears with:
  - "Add Content" button at top of sidebar (should be FAB)
  - "Integrations" as separate menu item (should be in Settings)
  - Guest indicator showing even when signed in with BYOK
- **Root Cause:** Possible Vercel cache or build issue
- **Fix:** Clear Vercel cache, force redeploy without cache

### Bug 4: BYOK key not passed to API routes ✅ FIXED
- **Status:** ✅ **VERIFIED FIXED** (See BUG_STATUS_REPORT.md)
- **Issue:** Even with BYOK badge showing, API routes (youtube, web, upload) still say "no API key"
- **Root Cause:** QuickCaptureModal and API routes not properly reading/passing the decrypted key
- **Fix Applied:** All API routes (YouTube, Web, Upload, Image, Audio) now:
  - Accept `apiKey` parameter from request body/FormData
  - Check for BYOK key first (highest priority)
  - Properly pass key through processing pipeline
- **Verification:** Code review confirms all routes accept and prioritize BYOK keys correctly

### Bug 5: Inconsistent state between auth modes ⚠️ MOSTLY FIXED
- **Status:** ⚠️ **MOSTLY FIXED** - Logic correct, may have edge cases (See BUG_STATUS_REPORT.md)
- **Issue:** App shows both "Guest" mode indicators AND user avatar simultaneously
- **Root Cause:** Auth state and BYOK state are checked separately, causing race conditions
- **Current State:** Conditional rendering logic is correct (`user ? CreditBalance : GuestUsageIndicator`)
- **Potential Issues:** 
  - Race conditions during sign-in
  - Cache issues (related to Bug 3)
  - Timing issues with BYOK state updates
- **Recommendation:** Test edge cases and verify no cache-related issues

---

## 🎯 Phase 0: Quick Start Mode (Credits System)
**Goal:** Remove BYOK friction - let users start immediately

### Why This First?
- BYOK creates barrier to entry for 80% of users
- Students/researchers just want it to work
- Credits = transparent, no subscription lock-in
- Still offer BYOK for power users

### Credit System Design

#### Credit Costs (Updated for Profitability)
| Action | Credits | OpenAI Cost | Your Revenue* | Margin |
|--------|---------|-------------|---------------|--------|
| Ask (GPT-3.5) | 1 credit | ~$0.002 | ~$0.008 | **75%** |
| Ask (GPT-4) | 10 credits | ~$0.04 | ~$0.08 | **50%** |
| Ask (GPT-4o) | 5 credits | ~$0.02 | ~$0.04 | **50%** |
| Ask (Claude) | 5 credits | ~$0.015 | ~$0.04 | **63%** |
| Upload (per page) | 1 credit | ~$0.0001 | ~$0.008 | **99%** |
| Process YouTube | 2 credits | ~$0.001 | ~$0.016 | **94%** |
| Process web page | 1 credit | ~$0.001 | ~$0.008 | **88%** |
| Transcribe audio/min | 3 credits | ~$0.006 | ~$0.024 | **75%** |
| Export insight | 0 credits | Free | Free | - |

*Based on Standard package ($0.008/credit)

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

#### 0.1 Database Schema ✅ COMPLETE
- [x] Create `credits` table (user_id, balance, created_at)
- [x] Create `credit_transactions` table (user_id, amount, action, timestamp)
- [x] Create `credit_packages` table (id, name, credits, price)
- [x] Add credit balance to user profile
- **Note:** Run `supabase-credits-schema.sql` in Supabase dashboard

#### 0.2 Credit Tracking Service ✅ COMPLETE
- [x] `deductCredits(userId, action, amount)` function
- [x] `getBalance(userId)` function
- [x] `addCredits(userId, amount, source)` function
- [x] Pre-action balance check (fail gracefully)
- [x] Transaction logging for audit
- **Location:** `lib/supabase/credits.ts`

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

#### 0.4 Server-Side AI ✅ CODE READY
- [x] Server-side API key (env variable) - Uses `OPENAI_API_KEY`
- [x] Credit check before API calls
- [x] Credit deduction after successful calls
- [x] BYOK vs Credits mode detection
- [x] Proper error messages for insufficient credits
- [ ] MoonScribe OpenAI account setup (add key to env)
- [ ] Rate limiting per user
- [ ] Fallback handling (API errors)
- [ ] Cost monitoring dashboard (internal)

#### 0.5 UI Components ✅ MOSTLY COMPLETE
- [x] Credit balance display in header
- [x] "Buy Credits" modal with packages
- [x] Low balance warning (visual indicator)
- [x] "Get 100 Free" button for new users
- [ ] Credit usage breakdown page
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

### 🔴 Competitive Gaps (Status Updated)
| Gap | Competitors Have | Our Status | Priority |
|-----|------------------|------------|----------|
| YouTube processing | NotebookLM, Recall | ✅ **COMPLETE** | ~~P0~~ |
| Web page scraping | Everyone | ✅ **COMPLETE** | ~~P0~~ |
| Protected/OCR PDFs | Adobe, ChatGPT | ✅ **COMPLETE** (detection) | ~~P1~~ |
| Image as source (JPEG/GIF) | ChatGPT, NotebookLM | ✅ **COMPLETE** | ~~P1~~ |
| Audio/podcast transcription | NotebookLM, Recall | ✅ **COMPLETE** | ~~P1~~ |
| Browser extension | Recall, Mem | Not started | **P1** |
| Better RAG quality | All (tuned) | Basic | **P1** |
| Mobile access | Most have apps | Web only | **P2** |
| Real-time collaboration | Notion, Mem | UI mockup | **P2** |
| User onboarding | All | None | **P2** |
| CRM integrations | Notion, Mem | Not started | **P2** |

---

## 🚀 Phase 1: Close Critical Gaps (P0) ✅ COMPLETE
**Goal:** Match table-stakes features competitors have

### 1.1 YouTube Processor ✅ COMPLETE
- [x] Extract video ID from YouTube URLs
- [x] Fetch transcript via youtube-transcript library
- [x] Handle videos without transcripts (show error)
- [x] Chunk transcript with timestamps
- [x] Store in Pinecone with video metadata
- [x] Display video thumbnail in library
- [x] Link citations to timestamp in video
- **Location:** `app/api/youtube/route.ts`

### 1.2 Web Page Scraper ✅ COMPLETE
- [x] URL validation and sanitization
- [x] Fetch page content with cheerio
- [x] Extract main content (readability algorithm)
- [x] Remove ads, navigation, footers
- [x] Preserve headings and structure
- [x] Handle paywalls gracefully (show error)
- [x] Store page snapshot with metadata
- **Location:** `app/api/web/route.ts`

### 1.3 Authentication ✅ COMPLETE
- [x] Supabase Auth UI (login/signup)
- [x] Email verification flow
- [x] Session management
- [x] Protected routes
- [x] Guest mode (5 free queries)
- [ ] Password reset (TODO)
- [ ] OAuth (Google, GitHub) - See setup instructions in Phase 0

---

## 🔧 Phase 2: Quality & Experience (P1)
**Goal:** Better than basic, approaching competitive quality

### 2.1 Audio/Podcast Transcription ✅ COMPLETE
- [x] Audio file upload (MP3, WAV, M4A)
- [x] Integration with Whisper API (OpenAI)
- [x] Timestamp-linked citations (clickable timestamps in chat)
- [x] Store transcripts in Pinecone with timestamps for RAG search
- [x] Credit deduction (3 credits per minute)
- [x] Support for BYOK, team keys, and credits mode
- [x] UI integration (QuickCaptureModal, SourcesPanel, project page)
- [x] Audio files counted in Media Files on dashboard
- [ ] Speaker diarization (who said what) - Future enhancement
- [ ] Podcast RSS feed import - Future enhancement
- **Location:** `app/api/audio/route.ts`
- **Status:** Core functionality complete. Speaker diarization and RSS import are future enhancements.

**Effort:** 4-5 days ✅ **COMPLETED**

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

### 2.5 Enhanced PDF Processing ✅ PARTIALLY COMPLETE
- [x] **Handle Protected/Encrypted PDFs**
  - [x] Detect password-protected PDFs (show error with explanation)
  - [x] Detect DRM-protected PDFs (show error with explanation)
  - [x] Detect corrupted PDFs (show error)
  - [x] Graceful fallback messaging
  - **Location:** `app/api/upload/route.ts`
- [x] **Handle OCR/Scanned PDFs**
  - [x] Detect image-based PDFs (low text density warning)
  - [x] Warning message suggesting OCR tools
  - [ ] Integrate Tesseract.js for client-side OCR (future)
  - [ ] OCR quality indicator (future)
- [ ] **PDF Quality Improvements** (Future)
  - [ ] Table extraction and formatting
  - [ ] Preserve document structure (headers, lists)
  - [ ] Handle multi-column layouts
  - [ ] Extract and index embedded images

### 2.6 Image Processing (JPEG, PNG, GIF) ✅ COMPLETE
- [x] **Image Upload Support**
  - [x] Accept JPEG, PNG, GIF, WebP formats
  - [x] 20MB max file size
  - **Location:** `app/api/image/route.ts`
- [x] **Image-to-Text (OCR)**
  - [x] Extract text from images (GPT-4 Vision)
  - [x] Screenshot text extraction
  - [x] Handwriting recognition (via Vision AI)
- [x] **Image Understanding (Vision AI)**
  - [x] GPT-4o Vision for image descriptions
  - [x] Describe charts, diagrams, infographics
  - [x] Generate searchable captions
  - [x] Index in Pinecone for RAG search
- [x] **Use Cases Supported**
  - [x] Whiteboard photos → searchable notes
  - [x] Receipt/invoice scanning
  - [x] Infographic analysis
  - [x] Screenshot documentation

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
- [ ] **intriq Sales CRM Integration**
  - [ ] Research intriq API capabilities
  - [ ] Import contacts/deals as context
  - [ ] Link insights to CRM records
  - [ ] Push AI-generated summaries to CRM
  - [ ] Sync meeting notes and follow-ups

**Effort:** 5-7 days (+ 3-4 days for intriq)

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

### Team System ✅ COMPLETE
- [x] Teams database schema (Supabase)
- [x] Server-side encryption for API keys
- [x] Team management API routes
- [x] Create team with auto-generated code (MOON-XXXX-XXXX)
- [x] Join team via team code
- [x] Team Settings UI (create/join/manage)
- [x] Team API key sharing (encrypted in Supabase)
- [x] All API routes support team API keys (priority: BYOK > Team > Credits)
- [x] Team members use leader's API key (no individual keys needed)

### Audio/Podcast Transcription ✅ COMPLETE
- [x] Audio file upload (MP3, WAV, M4A) via `/api/audio`
- [x] OpenAI Whisper API integration for transcription
- [x] Timestamp extraction and storage in Pinecone metadata
- [x] Transcript chunking with timestamps for RAG search
- [x] Timestamp-linked citations in chat (clickable timestamps)
- [x] Credit deduction (3 credits per minute)
- [x] Support for BYOK, team keys, and credits mode
- [x] UI integration (QuickCaptureModal, SourcesPanel, project page)
- [x] Audio files counted in Media Files on dashboard
- [x] Audio icon and display in content lists
- **Location:** `app/api/audio/route.ts`

### Development Process ✅ COMPLETE
- [x] Created `DEVELOPMENT_PROTOCOL.md` - Mandatory checklist for all code changes
- [x] Protocol includes pre-change checklist, verification steps, and best practices
- [x] Prevents repeated mistakes by enforcing systematic approach

---

## 📊 Business Tools

### OpenAI Business Account Setup
- [ ] **Create OpenAI Business/Organization Account**
  - Go to [platform.openai.com](https://platform.openai.com)
  - Create organization (not personal account)
  - Add business billing details
  - Set up usage limits and alerts
- [ ] **API Key Management**
  - Generate production API key
  - Add `OPENAI_API_KEY` to Vercel environment variables
  - Set up monthly spending limits ($100-500 initially)
  - Enable usage monitoring alerts (email at 80% of limit)
- [ ] **Tier Progression Plan**
  | Users | OpenAI Tier | Rate Limit | Monthly Spend |
  |-------|-------------|------------|---------------|
  | 0-100 | Tier 1-2 | 500-5K RPM | $50-100 |
  | 100-500 | Tier 3 | 5K RPM | $100-250 |
  | 500-1000 | Tier 4 | 10K RPM | $250-500 |
  | 1000+ | Tier 5/Enterprise | Custom | Custom |

### Why OpenAI is the Best Choice

| Provider | Quality | Cost | Embedding | Vision | Verdict |
|----------|---------|------|-----------|--------|---------|
| **OpenAI** | ⭐⭐⭐⭐⭐ | $$ | ✅ Best (text-embedding-3-large) | ✅ GPT-4o | **Best overall** |
| Anthropic | ⭐⭐⭐⭐⭐ | $$$ | ❌ No embeddings | ❌ No vision | Chat only |
| Google | ⭐⭐⭐⭐ | $ | ✅ Good | ✅ Gemini | Cheaper but less reliable |
| Cohere | ⭐⭐⭐ | $ | ✅ Good | ❌ | Budget option |

**OpenAI Advantages for MoonScribe:**
1. **Unified ecosystem** - One API for chat, embeddings, and vision
2. **Best embeddings** - `text-embedding-3-large` is industry-leading for RAG
3. **GPT-4o** - Best price/quality ratio for chat
4. **Vision built-in** - No separate service needed for image processing
5. **Reliable** - Best uptime and consistency
6. **Documentation** - Excellent docs and community support

**Cost Breakdown (per 1M tokens):**
| Model | Input | Output | Use Case |
|-------|-------|--------|----------|
| GPT-4o | $2.50 | $10.00 | Primary chat |
| GPT-4o-mini | $0.15 | $0.60 | Light queries |
| text-embedding-3-large | $0.13 | - | Document indexing |
| Whisper | $0.006/min | - | Audio (future) |

### Business Projection Calculator
- [ ] Interactive spreadsheet/calculator for cost projections
- [ ] Monthly user growth modeling (configurable signup rate)
- [ ] Revenue vs cost breakdown
- [ ] OpenAI API cost estimates by usage patterns
- [ ] Infrastructure cost tiers (Vercel, Supabase, Pinecone)
- [ ] Break-even analysis
- [ ] Churn rate adjustments
- [ ] Export to CSV/Excel

---

## 📈 Success Metrics

### Phase 1 Success
- [ ] Can process YouTube videos end-to-end
- [ ] Can capture and search web pages
- [ ] Users can create accounts and sync

### Phase 2 Success
- [ ] Answer quality improved (measure with test set)
- [ ] Browser extension has 100+ installs
- [x] Audio content searchable ✅ **COMPLETE**

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

*Last Updated: After Audio/Podcast Transcription implementation and Development Protocol creation*

## 📅 Today's Progress (Latest Session)

### ✅ Completed Today
1. **Audio/Podcast Transcription** - Full implementation
   - Created `/api/audio` route with OpenAI Whisper API
   - Audio file upload (MP3, WAV, M4A) support
   - Transcript storage in Pinecone with timestamps
   - Timestamp-linked citations in chat responses
   - Credit deduction (3 credits per minute)
   - UI integration across all upload points

2. **Timestamp-Linked Citations**
   - Clickable timestamps in audio source citations
   - Timestamp formatting (MM:SS or HH:MM:SS)
   - Copy to clipboard functionality
   - AI prompt enhancement to mention timestamps naturally

3. **Bug Fixes**
   - Fixed `deductCredits` function call in audio route (TypeScript error)
   - Fixed left arrow button positioning (accounting for AppShell sidebar)

4. **Development Process**
   - Created `DEVELOPMENT_PROTOCOL.md` - Mandatory checklist for all code changes
   - Establishes systematic approach to prevent repeated mistakes

### 🔄 Remaining High Priority Items
1. **Browser Extension** (P1) - 5-7 days
2. **Hybrid RAG** (P1) - 5-6 days  
3. **Rich Note Editor** (P1) - 4-5 days
4. **Password Reset Flow** (P1) - 1-2 days
5. **OAuth Setup** (P1) - 1 day (code ready, needs Supabase config)
6. **Speaker Diarization** (Future) - For audio transcription
7. **Podcast RSS Feed Import** (Future) - For audio transcription
