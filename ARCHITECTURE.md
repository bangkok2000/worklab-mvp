# MoonScribe - Complete Application Architecture

## Vision
MoonScribe is a comprehensive AI-powered knowledge management platform that helps users capture, organize, analyze, and share information from any source.

---

## 1. Content Types Supported

### Documents
| Type | Description | Processing |
|------|-------------|------------|
| PDF | Standard PDF files | Text extraction, OCR |
| Word (.docx) | Microsoft Word documents | Text extraction |
| Google Docs | Google Workspace documents | API integration |
| Google Slides | Google Workspace presentations | Slide text extraction |
| Markdown | .md files | Direct parsing |
| Plain Text | .txt files | Direct parsing |

### Media
| Type | Description | Processing |
|------|-------------|------------|
| YouTube Videos | With/without transcripts | Transcript extraction, Whisper API |
| YouTube Shorts | Short-form videos | Same as YouTube |
| TikTok | Short videos | Video download, transcription |
| Vimeo | Video hosting | Transcript extraction |
| Apple Podcasts | Audio podcasts | Whisper transcription |
| Spotify Podcasts | Audio podcasts | Whisper transcription |
| Audio Files | MP3, WAV, etc. | Whisper transcription |

### Web Content
| Type | Description | Processing |
|------|-------------|------------|
| URLs/Websites | Any web page | Web scraping, article extraction |
| Articles/Blogs | Online articles | Readability extraction |
| Bookmarks | Browser bookmarks | Import & process |
| Pocket Saves | Pocket app saves | API integration |
| Instapaper | Read-later service | API integration |

### Notes
| Type | Description | Processing |
|------|-------------|------------|
| Rich Text Notes | WYSIWYG editor | Direct storage |
| Markdown Notes | Markdown editor | Direct storage |
| Voice Notes | Audio recordings | Whisper transcription |
| Quick Captures | Quick text input | Direct storage |

---

## 2. Application Structure

### Page Hierarchy

```
/                                    → Landing / Marketing
/app                                 → Main Application
├── /dashboard                       → Home Dashboard
├── /library                         → Content Library
│   ├── /documents                   → All documents
│   ├── /media                       → Videos, podcasts, audio
│   ├── /web                         → Websites, articles, bookmarks
│   ├── /notes                       → Personal notes
│   └── /[contentId]                 → Single content view
├── /projects                        → Projects
│   ├── /                            → All projects list
│   └── /[projectId]                 → Project workspace
│       ├── /                        → Overview
│       ├── /sources                 → Project sources
│       ├── /chat                    → AI Chat
│       ├── /insights                → Saved insights
│       ├── /studio                  → Canvas/whiteboard
│       └── /settings                → Project settings
├── /insights                        → Global insights library
│   ├── /                            → All saved insights
│   ├── /[insightId]                 → Single insight view
│   └── /collections                 → Insight collections
├── /team                            → Team & Collaboration
│   ├── /                            → Team overview
│   ├── /members                     → Team members
│   ├── /workspaces                  → Team workspaces
│   ├── /shared                      → Shared with me
│   └── /activity                    → Activity feed
├── /integrations                    → Connected services
├── /settings                        → Global settings
│   ├── /profile                     → User profile
│   ├── /api-keys                    → API key management
│   ├── /billing                     → Subscription/billing
│   ├── /preferences                 → App preferences
│   └── /data                        → Data management
└── /export                          → Export center
```

---

## 3. Core Features

### 3.1 Content Ingestion
- **Upload**: Drag & drop, file picker
- **Import**: URL input, browser extension
- **Connect**: OAuth integrations (Google, Pocket, etc.)
- **Capture**: Quick capture widget, mobile app
- **Sync**: Automatic sync from connected services

### 3.2 Content Processing
- **Text Extraction**: PDF, Word, web pages
- **Transcription**: Audio/video via Whisper
- **Summarization**: AI-generated summaries
- **Chunking**: Semantic text splitting
- **Embedding**: Vector embeddings for search
- **Metadata**: Auto-extract titles, dates, authors

### 3.3 Organization
- **Projects**: Group related content
- **Tags**: Flexible tagging system
- **Collections**: Curated content groups
- **Smart Folders**: Auto-organize by rules
- **Search**: Full-text + semantic search

### 3.4 AI Features
- **Chat**: Conversational Q&A with sources
- **Summarize**: Generate summaries
- **Extract**: Pull key insights, facts, quotes
- **Compare**: Compare multiple sources
- **Generate**: Create new content from sources
- **Translate**: Multi-language support

### 3.5 Insights Management
- **Save**: Save specific AI responses
- **Annotate**: Add notes to insights
- **Tag**: Organize insights
- **Link**: Connect insights to sources
- **Cite**: Generate citations

### 3.6 Export & Sharing
- **Export Formats**: PDF, Markdown, Word, HTML
- **Share Links**: Public/private share links
- **Embed**: Embed in other apps
- **API**: Programmatic access
- **Integrations**: Send to Notion, Obsidian, etc.

### 3.7 Collaboration
- **Workspaces**: Personal vs Team
- **Roles**: Owner, Admin, Editor, Viewer
- **Sharing**: Share projects, insights, content
- **Comments**: Comment on insights
- **Activity**: Activity feed & notifications
- **Real-time**: Live collaboration

---

## 4. User Interface Components

### Global Components
```
├── AppShell              → Main layout wrapper
├── Sidebar               → Main navigation
├── Header                → Top bar with search
├── CommandPalette        → Cmd+K quick actions
├── NotificationCenter    → Alerts & updates
└── QuickCapture          → Global capture modal
```

### Dashboard
```
├── WelcomeSection        → Greeting, quick stats
├── RecentActivity        → Recent content & chats
├── QuickActions          → Common actions
├── ProjectsGrid          → Recent projects
└── InsightsPreview       → Recent insights
```

### Library Views
```
├── ContentGrid           → Grid view of content
├── ContentList           → List view of content
├── ContentFilters        → Filter sidebar
├── ContentSearch         → Search & sort
├── ContentPreview        → Quick preview modal
└── BulkActions           → Multi-select actions
```

### Project Workspace
```
├── ProjectHeader         → Project info, actions
├── SourcesPanel          → Content sources
├── ChatInterface         → AI conversation
├── HistoryPanel          → Chat history
├── InsightsPanel         → Saved insights
├── StudioCanvas          → Visual workspace
└── SourceViewer          → View source content
```

### Content Viewers
```
├── DocumentViewer        → PDF, docs viewer
├── VideoPlayer           → Video with transcript
├── AudioPlayer           → Podcast/audio player
├── ArticleReader         → Clean article view
├── NoteEditor            → Rich text editor
└── TranscriptView        → Synced transcript
```

### Insights
```
├── InsightCard           → Single insight
├── InsightEditor         → Edit/annotate
├── InsightExport         → Export options
├── InsightShare          → Share dialog
└── CitationGenerator     → Generate citations
```

### Team/Collaboration
```
├── TeamOverview          → Team dashboard
├── MemberList            → Team members
├── InviteModal           → Invite new members
├── PermissionsEditor     → Role management
├── ActivityFeed          → Team activity
└── SharedWithMe          → Shared content
```

---

## 5. Data Storage Philosophy

### Local-First (BYOK Consistent)

MoonScribe follows a **local-first** architecture that's philosophically consistent with BYOK:

```
Your Keys → Your Data → Your Control
```

#### Default Mode (No Account)
| Data Type | Storage | Location |
|-----------|---------|----------|
| API Keys | Encrypted | localStorage |
| Documents | Raw files | IndexedDB |
| Projects | JSON | localStorage |
| Conversations | JSON | localStorage |
| Insights | JSON | localStorage |
| Vectors | Text chunks | Pinecone* |

*Vectors are text fragments only - no filenames or identifying metadata.

#### Sync Mode (With Account)
| Data Type | Storage | Location |
|-----------|---------|----------|
| All above | Encrypted | Supabase |
| Enables | Multi-device sync, collaboration |

#### Why This Approach?
1. **Consistent with BYOK** - If we respect privacy for API keys, we should for documents too
2. **No account required** - Users can use the app immediately
3. **Explicit opt-in** - Cloud sync is a conscious choice, not default
4. **Enterprise-friendly** - Sensitive data never leaves the device unless user chooses

#### Vector Storage Note
Text chunks sent to Pinecone are:
- Fragments (500-1500 tokens), not full documents
- No filename or source metadata
- Just text for semantic similarity search

This is acceptable because:
- Chunks are meaningless without full context
- Similar to how BYOK works - your key, but OpenAI processes the text
- Industry standard for RAG applications

---

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'free' | 'pro' | 'team' | 'enterprise';
  createdAt: Date;
  settings: UserSettings;
}
```

### Workspace
```typescript
interface Workspace {
  id: string;
  name: string;
  type: 'personal' | 'team';
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: Date;
}
```

### Project
```typescript
interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  sources: string[]; // Content IDs
  createdAt: Date;
  updatedAt: Date;
}
```

### Content
```typescript
interface Content {
  id: string;
  workspaceId: string;
  type: ContentType;
  title: string;
  description?: string;
  sourceUrl?: string;
  metadata: ContentMetadata;
  status: 'processing' | 'ready' | 'error';
  chunks: ContentChunk[];
  createdAt: Date;
  updatedAt: Date;
}

type ContentType = 
  | 'pdf' | 'docx' | 'google_doc' | 'google_slide' | 'markdown' | 'text'
  | 'youtube' | 'youtube_short' | 'tiktok' | 'vimeo' | 'podcast' | 'audio'
  | 'url' | 'article' | 'bookmark'
  | 'note' | 'voice_note';
```

### Conversation
```typescript
interface Conversation {
  id: string;
  projectId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Insight
```typescript
interface Insight {
  id: string;
  workspaceId: string;
  projectId?: string;
  conversationId?: string;
  messageId?: string;
  title: string;
  content: string;
  sources: InsightSource[];
  tags: string[];
  annotations?: string;
  isPublic: boolean;
  shareId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 6. Integration Points

### Content Import
- Google Drive
- Dropbox
- OneDrive
- Pocket
- Instapaper
- Readwise
- Browser Extension

### Content Export
- Notion
- Obsidian
- Roam Research
- Evernote
- Google Docs
- Microsoft Word

### AI Providers (BYOK)
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- Ollama (Local)
- Azure OpenAI
- AWS Bedrock

### Authentication
- Email/Password
- Google OAuth
- GitHub OAuth
- Microsoft OAuth
- SSO (Enterprise)

---

## 7. Technical Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS / CSS-in-JS

### Backend
- Next.js API Routes
- Supabase (Database + Auth)
- Pinecone (Vector DB)
- Redis (Caching)

### AI/ML
- OpenAI API
- Anthropic API
- Whisper (Transcription)
- LangChain (Orchestration)

### Storage
- Supabase Storage
- S3 (Documents)
- CDN (Static assets)

### Infrastructure
- Vercel (Hosting)
- Supabase (Backend)
- Pinecone (Vectors)

---

## 8. Feature Roadmap

### Phase 1: Foundation ✓
- [x] Project structure
- [x] Basic UI framework
- [x] PDF upload & processing
- [x] Basic RAG chat
- [x] BYOK support

### Phase 2: Content Types
- [ ] Web/URL ingestion
- [ ] YouTube video support
- [ ] Note-taking editor
- [ ] Audio transcription
- [ ] Google Docs integration

### Phase 3: Organization
- [ ] Tags system
- [ ] Collections
- [ ] Smart search
- [ ] Content preview

### Phase 4: Insights
- [ ] Save answers as insights
- [ ] Insight annotations
- [ ] Export to PDF/Markdown
- [ ] Share links
- [ ] Citation generator

### Phase 5: Collaboration
- [ ] Team workspaces
- [ ] Member management
- [ ] Role permissions
- [ ] Activity feed
- [ ] Comments

### Phase 6: Integrations
- [ ] Notion export
- [ ] Pocket import
- [ ] Readwise sync

### Phase 7: Browser Extension
- [ ] Chrome/Firefox extension skeleton
- [ ] Quick capture popup (URL, selection, full page)
- [ ] Save to specific project
- [ ] Highlight & annotate on page
- [ ] YouTube transcript capture
- [ ] Right-click context menu
- [ ] Keyboard shortcuts

### Phase 8: Mobile App
- [ ] React Native or PWA
- [ ] Voice note capture
- [ ] Share sheet integration
- [ ] Offline mode

---

## 9. UI/UX Principles

1. **Clean & Focused**: Minimal UI, maximum content
2. **Fast**: Instant search, quick actions
3. **Flexible**: Multiple views, customizable
4. **Connected**: Everything links to everything
5. **Accessible**: Keyboard shortcuts, screen readers
6. **Delightful**: Smooth animations, micro-interactions

---

## 10. Monetization Model

### Free Tier
- 3 projects
- 50 documents
- 100 AI queries/month
- Basic export

### Pro ($12/month)
- Unlimited projects
- 500 documents
- 1000 AI queries/month
- All export formats
- Priority support

### Team ($20/user/month)
- Everything in Pro
- Team workspaces
- Collaboration features
- Admin controls
- SSO

### Enterprise (Custom)
- Everything in Team
- Unlimited usage
- Custom integrations
- Dedicated support
- SLA
