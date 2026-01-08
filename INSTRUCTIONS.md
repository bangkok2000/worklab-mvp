# MoonScribe - Project Instructions

> **Read this document first** at the start of every session. It contains essential context about the project.

---

## 📋 Project Overview

**MoonScribe** is an AI-powered document intelligence platform similar to NotebookLM and Recall. Users can:
- Upload and organize content from multiple sources (PDFs, YouTube, web pages, podcasts, notes)
- Ask AI questions about their documents using RAG (Retrieval-Augmented Generation)
- Save AI responses as "Insights" that can be exported and shared
- Collaborate with team members on shared workspaces
- Use their own API keys (BYOK - Bring Your Own Key)

---

## 🎯 Core Concept: Project-Driven Architecture

**Everything starts with a Project.** A Project is the central organizing unit.

```
PROJECT (Central Unit)
├── Sources        → Documents, videos, web pages, notes
├── Chat           → AI conversations about those sources
└── Insights       → Saved answers from conversations
```

### Navigation Hierarchy
```
Dashboard → Projects → Insights → Library → Team
```

### User Flow
1. **Create a Project** (e.g., "Q1 Research", "Client Analysis")
2. **Add Sources** to the project (PDFs, URLs, videos, notes)
3. **Chat with AI** about those sources
4. **Save Insights** from valuable AI responses
5. **Export/Share** insights with team or external

### Key Distinctions
- **Project Sources** = Content added to a specific project
- **Inbox** = Uncategorized content (assign to project later)
- **Library** = Global view of ALL content across all projects
- **Insights** = Saved AI responses (can be project-specific or global)
- **Team** = Collaboration on projects

### Content Capture Flow (Hybrid Approach)
```
Add Content Modal
├── Select Type (URL, Note, Upload)
├── Enter Content
├── Select Destination:
│   ├── 📥 Inbox (default) - Organize later
│   └── 📁 [Project Name] - Add directly
└── Save
```

**Why Inbox?**
- Fast capture without friction (especially for browser extension)
- Can organize later when you have time
- Content still searchable in Library
- Perfect for quick saves while browsing

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Frontend** | React 18, Custom CSS (no Tailwind) |
| **Database** | Supabase (PostgreSQL) |
| **Vector DB** | Pinecone |
| **AI/LLM** | OpenAI (GPT-4, GPT-3.5), Anthropic, Google, Ollama |
| **Embeddings** | OpenAI text-embedding-3-large |
| **PDF Parsing** | pdf-parse |
| **Auth** | Supabase Auth (planned) |

---

## 🔗 GitHub & Repository

```
Repository: /Users/mohmadnoorariffin/Documents/worklab-test
```

### Key Environment Variables (`.env.local`)
```env
# OpenAI
OPENAI_API_KEY=sk-...

# Pinecone
PINECONE_API_KEY=...
PINECONE_INDEX=moonscribe

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
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
│   ├── /library                → Content library
│   │   └── page.tsx            → All content types view
│   ├── /projects               → Projects
│   │   ├── page.tsx            → Projects list
│   │   └── /[projectId]        → Project workspace
│   ├── /insights               → Saved insights
│   ├── /team                   → Collaboration
│   ├── /integrations           → Connected services
│   └── /settings               → Settings pages
│
├── /api                        → API Routes
│   ├── /upload/route.ts        → PDF upload & processing
│   ├── /ask/route.ts           → RAG query endpoint
│   ├── /delete/route.ts        → Delete documents
│   └── /test-supabase/route.ts → Supabase connection test
│
├── /components
│   ├── /ui                     → Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── EmptyState.tsx
│   │   └── index.ts
│   ├── /layout                 → Layout components
│   │   ├── AppShell.tsx        → Main app wrapper with sidebar
│   │   └── index.ts
│   └── /features               → Feature-specific components
│
└── /styles
    ├── globals.css             → Global CSS
    └── theme.ts                → Design tokens

/lib
├── /supabase
│   ├── client.ts               → Supabase client setup
│   ├── types.ts                → Database types
│   ├── documents.ts            → Document CRUD
│   ├── conversations.ts        → Chat CRUD
│   └── usage.ts                → Usage tracking
│
└── /utils
    ├── api-keys.ts             → BYOK key management
    ├── encryption.ts           → Client-side encryption
    ├── api-client.ts           → Multi-provider API client
    └── query-expansion.ts      → Query enhancement
```

---

## 🎨 Design System

### Colors
```
Primary: #8b5cf6 (Purple)
Secondary: #6366f1 (Indigo)
Background: #0f0f23 → #1a1a2e (Dark gradient)
Text Primary: #f1f5f9
Text Secondary: #94a3b8
Text Muted: #64748b
Border: rgba(139, 92, 246, 0.15)
```

### Styling Approach
- **Inline styles** for components (not Tailwind)
- **Glassmorphism** effects with backdrop-filter
- **Purple accent** gradients throughout
- **Dark theme** only (for now)

---

## 🔄 Current State

### ✅ Completed
- [x] Full UI framework with all pages
- [x] Dashboard with stats and quick actions
- [x] Library view for all content types
- [x] Projects management (create, delete, list)
- [x] Insights page with export options
- [x] Team collaboration UI
- [x] Integrations hub
- [x] Settings (API keys, profile, billing, data)
- [x] BYOK (Bring Your Own Key) support
- [x] PDF upload and RAG pipeline
- [x] Basic chat functionality
- [x] Query expansion for better search

### 🔧 In Progress / Needs Work
- [ ] Wire project workspace to RAG system
- [ ] User authentication (Supabase Auth)
- [ ] Content processors (YouTube, web, audio)
- [ ] Note editor
- [ ] Real export functionality (PDF generation)
- [ ] Insights save flow from chat

### 📅 Future
- [ ] Browser extension
- [ ] Mobile app
- [ ] Real-time collaboration
- [ ] Advanced search filters

---

## 🚀 How to Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Access at
http://localhost:3000  → Redirects to /app
http://localhost:3000/app  → Main dashboard
```

---

## 📝 Key Files to Know

| File | Purpose |
|------|---------|
| `app/app/page.tsx` | Main dashboard |
| `app/components/layout/AppShell.tsx` | App wrapper with sidebar navigation |
| `app/api/upload/route.ts` | PDF processing & Pinecone indexing |
| `app/api/ask/route.ts` | RAG query with multi-provider support |
| `lib/utils/api-keys.ts` | BYOK key storage & management |
| `lib/supabase/client.ts` | Database client setup |
| `ARCHITECTURE.md` | Full architecture documentation |

---

## ⚠️ Important Notes

### RAG Pipeline
1. **Upload**: PDF → Extract text → Chunk (semantic, 1500 tokens) → Embed → Store in Pinecone
2. **Query**: Question → Expand query → Embed → Search Pinecone → Build context → LLM response

### BYOK (Bring Your Own Key)
- Keys are encrypted client-side using Web Crypto API
- Stored in localStorage (per user/session)
- Backend falls back to server key if no user key provided

### Data Storage (Local-First, BYOK Consistent)

**Philosophy:** BYOK = Your keys, your data, your control. Therefore, local-first.

```
Default (No Account):
├── API Keys      → localStorage (encrypted)
├── Documents     → IndexedDB (local)
├── Conversations → localStorage (local)
├── Insights      → localStorage (local)
├── Projects      → localStorage (local)
└── Vectors       → Pinecone (text chunks only*)

With Account (Optional):
├── All above     → Synced to Supabase (encrypted)
├── Enables       → Multi-device sync, collaboration
└── User Choice   → Explicit opt-in for cloud
```

*Vectors in Pinecone are text fragments only - no filenames, no metadata that identifies source. Acceptable because chunks are meaningless without context.

**Why Local-First?**
- Consistent with BYOK philosophy
- No account required for basic use
- Maximum privacy by default
- User explicitly opts into cloud if they want sync/collaboration

### Content Types Supported (UI Ready)
- Documents: PDF, Word, Google Docs/Slides, Markdown
- Media: YouTube, Vimeo, TikTok, Podcasts, Audio
- Web: URLs, Articles, Bookmarks, Pocket saves
- Notes: Rich text, Markdown, Voice notes

---

## 🔧 Common Tasks

### Add a New Page
1. Create folder in `app/app/[pagename]/`
2. Add `page.tsx` with component
3. Update navigation in `AppShell.tsx`

### Add a New UI Component
1. Create in `app/components/ui/`
2. Export from `app/components/ui/index.ts`

### Add a New API Route
1. Create in `app/api/[routename]/route.ts`
2. Export `POST` or `GET` function

### Test Supabase Connection
```bash
curl http://localhost:3000/api/test-supabase
```

---

## 📚 Related Documents

- `ARCHITECTURE.md` - Full system architecture
- `SUPABASE_SCHEMA.md` - Database schema documentation
- `supabase-schema.sql` - SQL for creating tables
- `PRODUCT_STRATEGY.md` - Product vision and roadmap
- `TODO.md` - Detailed task list

---

## 🎯 Next Priority Tasks

1. **Wire Project Workspace** - Connect `/app/projects/[projectId]` to existing RAG
2. **Project-centric flow** - Ensure all sources/chats/insights are project-scoped
3. **IndexedDB for Documents** - Implement local document storage (not just localStorage)
4. **Authentication (Optional)** - Supabase Auth for users who want cloud sync
5. **YouTube Processor** - Extract transcripts from YouTube URLs
6. **Web Scraper** - Extract content from URLs

---

*Last Updated: January 2026*
