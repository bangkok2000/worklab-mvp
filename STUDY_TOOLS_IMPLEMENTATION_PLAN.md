# Study Tools Implementation Plan
**Following DEVELOPMENT_PROTOCOL.md Strictly**

---

## 📋 Step 1: Understand the Full Context

### Current Structure
- **Project Workspace:** `/app/projects/[projectId]/page.tsx`
- **Layout:** Left Panel (Sources) | Center (Chat) | Right Panel (History)
- **Current Center Panel:** ChatPanel component only
- **Tab Pattern:** Used in SettingsPage, LibraryPage, TeamPage

### Target Structure (From PRODUCT_STRATEGY.md)
- **Center Panel:** Should be "Studio" with tabbed interface
- **Tabs Needed:**
  1. 📝 Summary
  2. 🎴 Flashcards
  3. ❓ Quiz
  4. 🧠 Mind Map
  5. 📚 Study Guide
  6. 🎙️ Audio Overview

### Data Flow
1. User selects project → loads documents
2. User clicks study tool tab → generates content from documents
3. API call to generate study tool content
4. Display generated content
5. Save/export functionality

---

## 📋 Step 2: Find Working Examples

### Tab Implementation Pattern
**Found in:** `app/app/settings/page.tsx`, `app/app/library/page.tsx`
**Pattern:**
```typescript
const tabs = [
  { id: 'tab1', label: 'Tab 1', icon: '📝' },
  { id: 'tab2', label: 'Tab 2', icon: '🎴' },
];

// Tab buttons
<div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid...' }}>
  {tabs.map(tab => (
    <button
      onClick={() => setActiveTab(tab.id)}
      style={{
        background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
        color: activeTab === tab.id ? '#c4b5fd' : '#94a3b8',
      }}
    >
      <span>{tab.icon}</span>
      {tab.label}
    </button>
  ))}
</div>

// Tab content
{activeTab === 'tab1' && <Tab1Content />}
{activeTab === 'tab2' && <Tab2Content />}
```

### API Call Pattern
**Found in:** `app/app/projects/[projectId]/page.tsx` - `handleSendMessage`
**Pattern:**
```typescript
const res = await fetch('/api/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: content,
    sourceFilenames: readyDocuments.map(d => d.name),
    apiKey: userApiKey || undefined,
    provider,
    model,
  }),
});
```

### RAG Query Pattern
**Found in:** `app/api/ask/route.ts`
- Uses Pinecone for vector search
- Builds context from document chunks
- Calls OpenAI/Anthropic with context
- Returns answer with sources

---

## 📋 Step 3: Verify Function Signatures & APIs

### API Routes Needed
1. `/api/study/flashcards` - Generate flashcards
2. `/api/study/quiz` - Generate quiz
3. `/api/study/summary` - Generate summary
4. `/api/study/study-guide` - Generate study guide
5. `/api/study/mind-map` - Generate mind map (JSON structure)
6. `/api/study/audio` - Generate audio overview (text-to-speech)

### Function Signatures
**From `/api/ask/route.ts`:**
```typescript
export async function POST(req: NextRequest) {
  const { 
    question, 
    sourceFilenames,
    apiKey,
    provider = 'openai',
    model,
  } = await req.json();
  // ... RAG logic
  return NextResponse.json({ answer, sources });
}
```

**Study Tools API Pattern:**
```typescript
export async function POST(req: NextRequest) {
  const { 
    sourceFilenames,
    apiKey,
    provider = 'openai',
    model,
    options = {}, // Tool-specific options
  } = await req.json();
  // ... RAG + generation logic
  return NextResponse.json({ content, sources });
}
```

---

## 📋 Step 4: Calculate/Verify Logic

### UI Layout
**Current Center Panel:**
- Width: `flex: 1` (takes remaining space)
- Height: `100%`
- Contains: ChatPanel only

**New Center Panel Structure:**
```
┌─────────────────────────────────────┐
│  Tabs: [Chat] [Summary] [Flashcards]│
│       [Quiz] [Mind Map] [Study Guide]│
├─────────────────────────────────────┤
│                                     │
│  Tab Content Area                   │
│  (ChatPanel or StudyToolPanel)      │
│                                     │
└─────────────────────────────────────┘
```

**Tab Bar Height:** ~48px (padding + border)
**Content Area:** `calc(100% - 48px)`

### Data Storage
- **Study Tools Data:** Store in localStorage per project
- **Key Pattern:** `moonscribe-project-${projectId}-study-tools`
- **Structure:**
```typescript
{
  flashcards: Flashcard[],
  quizzes: Quiz[],
  summaries: Summary[],
  studyGuides: StudyGuide[],
  mindMaps: MindMap[],
  audioOverviews: AudioOverview[],
}
```

### API Request Flow
1. User clicks tab → Check if content exists in localStorage
2. If exists → Load from localStorage
3. If not → Show "Generate" button
4. User clicks "Generate" → Call API with sourceFilenames
5. API does RAG search → Generates content → Returns
6. Save to localStorage → Display

---

## 📋 Step 5: Check Dependencies

### Required Imports
- `React, useState, useEffect` - Already available
- `NextRequest, NextResponse` - For API routes
- `OpenAI, Pinecone` - Already available
- `getDecryptedApiKey` - Already available
- `createServerClient` - Already available

### TypeScript Types Needed
```typescript
interface Flashcard {
  id: string;
  front: string;
  back: string;
  source: string;
  createdAt: Date;
}

interface Quiz {
  id: string;
  questions: QuizQuestion[];
  createdAt: Date;
}

interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
}

interface Summary {
  id: string;
  content: string;
  type: 'executive' | 'detailed' | 'bullet-points';
  sources: string[];
  createdAt: Date;
}

interface StudyGuide {
  id: string;
  title: string;
  sections: StudyGuideSection[];
  createdAt: Date;
}

interface StudyGuideSection {
  title: string;
  content: string;
  keyPoints: string[];
}

interface MindMap {
  id: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  createdAt: Date;
}

interface MindMapNode {
  id: string;
  label: string;
  type: 'concept' | 'topic' | 'detail';
  x?: number;
  y?: number;
}

interface MindMapEdge {
  from: string;
  to: string;
  label?: string;
}
```

---

## 🎯 Implementation Steps

### Phase 1: Create StudioPanel Component (MVP)
1. Create `app/components/features/StudioPanel.tsx`
2. Add tab navigation (Chat + Study Tools)
3. Integrate ChatPanel as first tab
4. Add placeholder tabs for study tools

### Phase 2: Create Study Tools API Routes
1. Create `/app/api/study/flashcards/route.ts`
2. Create `/app/api/study/quiz/route.ts`
3. Create `/app/api/study/summary/route.ts`
4. Create `/app/api/study/study-guide/route.ts`
5. Create `/app/api/study/mind-map/route.ts`

### Phase 3: Implement Study Tool Components
1. FlashcardsPanel component
2. QuizPanel component
3. SummaryPanel component
4. StudyGuidePanel component
5. MindMapPanel component

### Phase 4: Integrate into Project Workspace
1. Replace ChatPanel with StudioPanel
2. Pass necessary props (documents, projectId, etc.)
3. Test all tabs

---

## ✅ Pre-Commit Checklist

Before committing:
- [ ] Read ALL relevant files
- [ ] Understand full context
- [ ] Verified function signatures match usage
- [ ] Calculated/verified all values
- [ ] Compared with working examples
- [ ] Run linter checks
- [ ] Verified logic is correct
- [ ] Checked for TypeScript errors
- [ ] Accounted for all parent containers/layouts
- [ ] Confident this fix is correct

---

**Status:** Ready to implement following protocol
**Next:** Start with Phase 1 - Create StudioPanel component
