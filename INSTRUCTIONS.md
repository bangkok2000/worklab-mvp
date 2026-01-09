# MoonScribe - Project Instructions

> **Read this document first** at the start of every session. It contains essential context about the project.

---

## 📋 Project Overview

**MoonScribe** is an AI-powered document intelligence platform similar to NotebookLM and Recall. Users can:
- Upload and organize content from multiple sources (PDFs, YouTube, web pages, images, notes)
- Ask AI questions about their documents using RAG (Retrieval-Augmented Generation)
- Save AI responses as "Insights" that can be exported and shared
- Collaborate with team members using shared API keys via Team Codes
- Use their own API keys (BYOK - Bring Your Own Key) OR use MoonScribe's AI with credits

---

## 🎯 Core Concept: Project-Driven Architecture

**Everything starts with a Project.** A Project is the central organizing unit.

```
PROJECT (Central Unit)
├── Sources        → Documents, videos, web pages, images, notes
├── Chat           → AI conversations about those sources
└── Insights       → Saved answers from conversations
```

### Navigation Hierarchy
```
Dashboard → Inbox → Projects → Insights → Library → Team
```

### User Flow
1. **Create a Project** (e.g., "Q1 Research", "Client Analysis")
2. **Add Sources** to the project (PDFs, URLs, videos, images, notes)
3. **Chat with AI** about those sources
4. **Save Insights** from valuable AI responses
5. **Export/Share** insights with team or external

### Content Capture Flow (Hybrid Approach)
```
Add Content (FAB Button)
├── Select Type (URL, Note, Upload, YouTube, Image)
├── Enter Content
├── Select Destination:
│   ├── 📥 Inbox (default) - Organize later
│   └── 📁 [Project Name] - Add directly
└── Save & Process
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Frontend** | React 18, Custom CSS (no Tailwind) |
| **Database** | Supabase (PostgreSQL) |
| **Vector DB** | Pinecone |
| **AI/LLM** | OpenAI (GPT-4o, GPT-3.5), Anthropic Claude |
| **Embeddings** | OpenAI text-embedding-3-large |
| **Vision AI** | GPT-4o Vision (for images) |
| **PDF Parsing** | pdf-parse |
| **Web Scraping** | cheerio |
| **YouTube** | youtube-transcript |
| **Auth** | Supabase Auth |
| **Payments** | Stripe |

---

## 💳 Monetization Model: Credits System

### How It Works
- **New users**: Get 100 free credits
- **Credits mode**: Pay per use (no subscription)
- **BYOK mode**: Unlimited usage with your own API key
- **Team mode**: Share team leader's API key via Team Code

### Credit Costs
| Action | Credits | Notes |
|--------|---------|-------|
| Ask (GPT-3.5) | 1 | Basic queries |
| Ask (GPT-4o) | 5 | Advanced queries |
| Ask (GPT-4) | 10 | Most powerful |
| Ask (Claude) | 5 | Anthropic |
| Upload PDF (per page) | 1 | Document processing |
| Process YouTube | 2 | Video transcripts |
| Process Web Page | 1 | URL scraping |
| Process Image | 5 | Vision AI analysis |

### API Key Priority
When making AI requests, the system checks in order:
1. **User BYOK** - Personal API key from request (highest priority)
2. **Team API Key** - From team leader (if user is in a team)
3. **Server Credits** - MoonScribe's key (deducts credits)

---

## 👥 Team System

### How Teams Work
1. **Team Leader** creates a team → Gets unique Team Code (e.g., `MOON-A1B2-C3D4`)
2. **Team Leader** adds their OpenAI API key (encrypted, stored in Supabase)
3. **Team Members** join using the Team Code
4. **All members** use the team's API key (no credits deducted, no individual keys needed)

### Team API Routes
- `POST /api/teams` - Create team
- `POST /api/teams/join` - Join team with code
- `PUT /api/teams/api-key` - Update team API key
- `GET/DELETE /api/teams/members` - Manage members

---

## 🔗 Environment Variables

```env
# Required for all features
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
PINECONE_API_KEY=...
PINECONE_INDEX=moonscribe

# For Credits Mode (MoonScribe's AI)
OPENAI_API_KEY=sk-...

# For Team API Key Encryption
ENCRYPTION_SECRET=your-32-char-secret

# For Stripe Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## 📁 Project Structure

```
/app
├── page.tsx                    → Landing (redirects to /app)
├── layout.tsx                  → Root layout
├── globals.css                 → Global styles
│
├── /app                        → Main Application (with AppShell)
│   ├── layout.tsx              → App layout with sidebar
│   ├── page.tsx                → Dashboard
│   ├── /inbox                  → Uncategorized content
│   ├── /library                → Content library
│   │   ├── /documents          → PDFs, docs
│   │   ├── /media              → YouTube, audio
│   │   ├── /web                → URLs, articles
│   │   └── /notes              → Notes
│   ├── /projects               → Projects
│   │   └── /[projectId]        → Project workspace
│   ├── /insights               → Saved insights
│   ├── /team                   → Team management
│   └── /settings               → Settings (Profile, API Keys, Team, Integrations)
│
├── /auth                       → Authentication
│   ├── /signin                 → Sign in page
│   ├── /signup                 → Sign up page
│   └── /callback               → OAuth callback
│
├── /api                        → API Routes
│   ├── /ask/route.ts           → RAG query endpoint
│   ├── /upload/route.ts        → PDF upload & processing
│   ├── /youtube/route.ts       → YouTube video processing
│   ├── /web/route.ts           → Web page scraping
│   ├── /image/route.ts         → Image processing (Vision AI)
│   ├── /teams/                 → Team management APIs
│   │   ├── route.ts            → Create/get team
│   │   ├── /join/route.ts      → Join team
│   │   ├── /api-key/route.ts   → Manage team API key
│   │   └── /members/route.ts   → Manage members
│   └── /stripe/                → Payment APIs
│       ├── /checkout/route.ts  → Create checkout session
│       └── /webhook/route.ts   → Handle Stripe events
│
├── /components
│   ├── /ui                     → Reusable UI components
│   ├── /layout                 → Layout components (AppShell, Sidebar)
│   └── /features               → Feature components (CreditBalance, TeamSettings)
│
/lib
├── /auth                       → Auth context, protected routes
├── /supabase                   → Supabase utilities
│   ├── client.ts               → Supabase clients
│   ├── credits.ts              → Credits service
│   ├── teams.ts                → Teams service
│   └── types.ts                → Database types
├── /stripe                     → Stripe utilities
└── /utils                      → Utilities (encryption, API keys)
```

---

## 🔄 Current State

### ✅ Complete (Working)
- [x] Full UI framework with all pages
- [x] Dashboard with real stats from localStorage
- [x] Library view with sub-pages (Documents, Media, Web, Notes)
- [x] Projects management
- [x] Insights page with edit/delete/archive/export
- [x] Settings (Profile, API Keys, Team, Integrations tabs)
- [x] **Authentication** - Email/password sign up/sign in
- [x] **Guest Mode** - 5 free queries without account
- [x] **BYOK** - Bring Your Own Key support
- [x] **Credits System** - Full backend (DB schema, service, deduction)
- [x] **Stripe Integration** - Checkout and webhook handlers
- [x] **Team System** - Create team, join via code, shared API key
- [x] **PDF Processing** - Upload, extract, chunk, embed, RAG
- [x] **YouTube Processing** - Transcript extraction, timestamped chunks
- [x] **Web Scraping** - URL content extraction, clean text
- [x] **Image Processing** - GPT-4 Vision analysis, OCR
- [x] **Enhanced PDF Detection** - Password-protected, DRM, scanned PDF warnings

### 🔧 Needs Manual Setup
- [ ] OpenAI Business Account (add `OPENAI_API_KEY` to Vercel)
- [ ] Stripe Account (add keys to Vercel, create webhook)
- [ ] Run `supabase-credits-schema.sql` in Supabase
- [ ] Run `supabase-teams-schema.sql` in Supabase
- [ ] OAuth providers (Google, GitHub) - optional

### 📅 Future Development
- [ ] Audio/Podcast transcription (Whisper API)
- [ ] Browser extension (Chrome/Firefox)
- [ ] Hybrid RAG (better answer quality)
- [ ] Rich note editor
- [ ] Mobile PWA
- [ ] Real-time collaboration

---

## 🚀 How to Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Access at
http://localhost:3000/app  → Main dashboard
```

### Production Deployment (Vercel)
1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables
4. Deploy

---

## 📝 Key Files to Know

| File | Purpose |
|------|---------|
| `app/app/page.tsx` | Main dashboard |
| `app/components/layout/AppShell.tsx` | App wrapper with sidebar, FAB, header |
| `app/api/ask/route.ts` | RAG query with team/BYOK/credits support |
| `app/api/upload/route.ts` | PDF processing with enhanced detection |
| `app/api/youtube/route.ts` | YouTube transcript processing |
| `app/api/web/route.ts` | Web page scraping |
| `app/api/image/route.ts` | Image processing with Vision AI |
| `app/api/teams/route.ts` | Team management |
| `lib/supabase/credits.ts` | Credits tracking service |
| `lib/supabase/teams.ts` | Team API key retrieval |
| `lib/utils/server-encryption.ts` | Server-side API key encryption |
| `supabase-credits-schema.sql` | Credits database schema |
| `supabase-teams-schema.sql` | Teams database schema |
| `TODO.md` | Detailed roadmap and task list |

---

## ⚠️ Important Notes

### RAG Pipeline
1. **Upload**: PDF → Extract text → Detect issues → Chunk → Embed → Store in Pinecone
2. **Query**: Question → Expand query → Embed → Search Pinecone → Build context → LLM response

### API Key Priority (for AI calls)
1. User's BYOK key (from request) - no credits used
2. Team API key (from Supabase) - no credits used
3. Server key + credits - credits deducted

### Data Storage
- **Local Storage**: Projects, Insights, Inbox content
- **Supabase**: User auth, credits, teams, team API keys (encrypted)
- **Pinecone**: Vector embeddings (text chunks only)

### PDF Detection
The upload route detects:
- Password-protected PDFs → Error with instructions
- DRM-protected PDFs → Error with instructions
- Scanned/OCR PDFs → Warning with low text density

---

## 📚 Related Documents

- `TODO.md` - Detailed roadmap with completion status
- `ARCHITECTURE.md` - Full system architecture
- `supabase-credits-schema.sql` - Credits database schema
- `supabase-teams-schema.sql` - Teams database schema

---

*Last Updated: January 2026*
