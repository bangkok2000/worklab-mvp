# MoonScribe - Complete Application Architecture

## Vision
MoonScribe is a comprehensive AI-powered knowledge management platform that helps users capture, organize, analyze, and share information from any source.

---

## 1. Content Types Supported

### Documents ✅
| Type | Description | Status |
|------|-------------|--------|
| PDF | Standard PDF files | ✅ Complete |
| Protected PDF | Password/DRM protected | ✅ Detection + Warning |
| Scanned PDF | Image-based PDFs | ✅ Detection + Warning |

### Media ✅
| Type | Description | Status |
|------|-------------|--------|
| YouTube Videos | With transcripts | ✅ Complete |
| YouTube Shorts | Short-form videos | ✅ Complete |
| Audio Files | MP3, WAV, etc. | 🔜 Planned (Whisper) |
| Podcasts | Audio podcasts | 🔜 Planned |

### Images ✅ NEW
| Type | Description | Status |
|------|-------------|--------|
| JPEG/PNG/GIF/WebP | Image files | ✅ Complete |
| Screenshots | Screen captures | ✅ Complete |
| Whiteboard Photos | Handwritten notes | ✅ Complete |
| Infographics | Charts, diagrams | ✅ Complete |

### Web Content ✅
| Type | Description | Status |
|------|-------------|--------|
| URLs/Websites | Any web page | ✅ Complete |
| Articles/Blogs | Online articles | ✅ Complete |

### Notes
| Type | Description | Status |
|------|-------------|--------|
| Quick Captures | Quick text input | ✅ UI Ready |
| Rich Text Notes | WYSIWYG editor | 🔜 Planned |
| Voice Notes | Audio recordings | 🔜 Planned |

---

## 2. Application Structure

### Page Hierarchy

```
/                                    → Landing / Marketing
/app                                 → Main Application
├── /                                → Dashboard
├── /inbox                           → Uncategorized content
├── /library                         → Content Library
│   ├── /documents                   → PDFs, docs
│   ├── /media                       → YouTube, audio
│   ├── /web                         → URLs, articles
│   └── /notes                       → Personal notes
├── /projects                        → Projects
│   └── /[projectId]                 → Project workspace (chat + sources)
├── /insights                        → Saved AI insights
├── /team                            → Team management
└── /settings                        → Settings
    ├── Profile tab
    ├── API Keys tab
    ├── Team tab
    └── Integrations tab
/auth
├── /signin                          → Sign in
├── /signup                          → Sign up
└── /callback                        → OAuth callback
```

---

## 3. Core Features

### 3.1 Content Ingestion ✅
- **Upload**: Drag & drop, file picker (PDF, images)
- **URL**: YouTube videos, web pages
- **Quick Capture**: FAB button for fast adding

### 3.2 Content Processing ✅
- **PDF**: Text extraction, semantic chunking, embedding
- **YouTube**: Transcript extraction with timestamps
- **Web**: Clean text extraction with metadata
- **Images**: GPT-4 Vision analysis, OCR text extraction
- **Detection**: Password-protected, DRM, scanned PDF warnings

### 3.3 Organization ✅
- **Projects**: Group related content
- **Inbox**: Uncategorized content for later organization
- **Library**: Browse all content by type

### 3.4 AI Features ✅
- **RAG Chat**: Conversational Q&A with sources
- **Citations**: Source references with relevance scores
- **Multi-model**: GPT-4o, GPT-4, GPT-3.5, Claude
- **Vision**: Image understanding and OCR

### 3.5 Insights Management ✅
- **Save**: Save AI responses as insights
- **Edit**: Edit title, content, tags
- **Archive**: Archive old insights
- **Export**: Copy, Markdown, PDF formats
- **Filter**: By project, tag, date

### 3.6 Authentication ✅
- **Email/Password**: Standard auth
- **Guest Mode**: 5 free queries
- **OAuth**: Google, GitHub (config needed)

### 3.7 Team Collaboration ✅ NEW
- **Team Codes**: Unique codes like `MOON-A1B2-C3D4`
- **Shared API Key**: Team leader's key used by all members
- **Server-side Encryption**: AES-256-GCM for stored keys
- **No Individual Keys Needed**: Members just join with code

---

## 4. Data Storage Architecture

### Local-First Philosophy
```
Your Keys → Your Data → Your Control
```

### Storage Locations

| Data Type | Location | Encryption |
|-----------|----------|------------|
| User Auth | Supabase Auth | Supabase managed |
| Credits Balance | Supabase | None (just numbers) |
| Team Info | Supabase | Team code plain, API key encrypted |
| Team API Keys | Supabase | AES-256-GCM server-side |
| Projects | localStorage | None |
| Insights | localStorage | None |
| Inbox Content | localStorage | None |
| Personal API Keys | localStorage | AES-GCM client-side |
| Vector Embeddings | Pinecone | None (text chunks only) |

### Why This Approach?
1. **BYOK Consistent**: If we respect privacy for keys, we should for data too
2. **No account required**: Basic use works without sign-up
3. **Team-friendly**: Shared API key simplifies team onboarding
4. **Enterprise-safe**: Sensitive data controllable

---

## 5. API Architecture

### Content Processing APIs

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/upload` | POST | PDF processing | Optional |
| `/api/youtube` | POST | YouTube transcript | Optional |
| `/api/web` | POST | Web page scraping | Optional |
| `/api/image` | POST | Image processing | Optional |
| `/api/ask` | POST | RAG query | Optional |

### Team APIs

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/teams` | POST | Create team | Yes |
| `/api/teams` | GET | Get user's team | Yes |
| `/api/teams/join` | POST | Join team with code | Yes |
| `/api/teams/api-key` | PUT | Update team API key | Yes (owner) |
| `/api/teams/api-key` | DELETE | Remove team API key | Yes (owner) |
| `/api/teams/members` | GET | List members | Yes |
| `/api/teams/members` | DELETE | Remove member | Yes (owner) |

### Payment APIs

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/stripe/checkout` | POST | Create checkout session | Yes |
| `/api/stripe/webhook` | POST | Handle Stripe events | Stripe signature |

### API Key Priority Logic
```
Request comes in
    │
    ├─ Has apiKey in request body? → Use it (BYOK)
    │
    ├─ User authenticated?
    │   └─ Has team with API key? → Use team key
    │
    └─ Use server OPENAI_API_KEY + deduct credits
```

---

## 6. Monetization Model

### Credits System (Current)

| Package | Credits | Price | Per Credit |
|---------|---------|-------|------------|
| **Starter** | 100 | Free (once) | Free |
| **Basic** | 500 | $5 | $0.01 |
| **Standard** | 1,500 | $12 | $0.008 |
| **Pro** | 5,000 | $35 | $0.007 |
| **BYOK** | ∞ | $0 | Your cost |
| **Team** | ∞ | Leader's key | Leader's cost |

### Credit Costs

| Action | Credits | Your Cost | Margin |
|--------|---------|-----------|--------|
| Ask (GPT-3.5) | 1 | ~$0.002 | ~75% |
| Ask (GPT-4o) | 5 | ~$0.02 | ~60% |
| Ask (GPT-4) | 10 | ~$0.04 | ~50% |
| Ask (Claude) | 5 | ~$0.015 | ~70% |
| Upload (per page) | 1 | ~$0.0001 | ~99% |
| YouTube | 2 | ~$0.001 | ~94% |
| Web page | 1 | ~$0.001 | ~88% |
| Image | 5 | ~$0.02 | ~60% |

### Revenue Projection (1000 users)
- Monthly revenue: ~$1,500-2,000
- OpenAI costs: ~$150-300
- Infrastructure: ~$100-200
- **Net profit: ~$1,200-1,500/month**

---

## 7. Technical Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Custom CSS (inline styles, no Tailwind)

### Backend
- Next.js API Routes
- Supabase (Database + Auth)
- Pinecone (Vector DB)

### AI/ML
- OpenAI API (GPT-4o, GPT-4, GPT-3.5, Embeddings, Vision)
- Anthropic API (Claude)

### Processing
- pdf-parse (PDF text extraction)
- cheerio (HTML parsing)
- youtube-transcript (YouTube transcripts)

### Payments
- Stripe (Checkout, Webhooks)

### Infrastructure
- Vercel (Hosting)
- Supabase (Backend)
- Pinecone (Vectors)

---

## 8. Security

### API Key Security
| Key Type | Storage | Encryption |
|----------|---------|------------|
| Personal BYOK | localStorage | AES-GCM (Web Crypto API) |
| Team API Key | Supabase | AES-256-GCM (server-side) |
| Server Key | Vercel env | Vercel encrypted |

### Authentication
- Supabase Auth with RLS (Row Level Security)
- JWT tokens for API routes
- Guest mode with limited queries

### Data Protection
- RLS policies on all Supabase tables
- Team API keys only decrypted server-side
- No raw API keys in client responses

---

## 9. Feature Status

### ✅ Complete
- Project-driven architecture
- Multi-source RAG (PDF, YouTube, Web, Images)
- Credits system with Stripe
- Team system with shared API keys
- Authentication with guest mode
- Insights management
- Enhanced PDF detection

### 🔜 Planned
- Audio/podcast transcription
- Browser extension
- Rich note editor
- Mobile PWA
- Real-time collaboration
- OAuth providers

---

## 10. Design System

### Colors
```
Primary: #8b5cf6 (Purple)
Secondary: #6366f1 (Indigo)
Background: #0f0f23 → #1a1a2e (Dark gradient)
Text Primary: #f1f5f9
Text Secondary: #94a3b8
Text Muted: #64748b
Border: rgba(139, 92, 246, 0.15)
Success: #34d399
Warning: #fbbf24
Error: #f87171
```

### UI Patterns
- Glassmorphism with backdrop-filter
- Purple accent gradients
- Dark theme only
- FAB for primary action
- Inline styles (no Tailwind)

---

*Last Updated: January 2026*
