# MoonScribe Migration Guide

## 🔄 Pinecone Index Migration

### Option 1: Fresh Start (Recommended for Testing)

If you're starting fresh or don't have important data in the old index:

1. **Update `.env.local`:**
   ```env
   PINECONE_INDEX=moonscribe-test
   ```

2. **Create New Index in Pinecone:**
   - Go to [Pinecone Console](https://app.pinecone.io/)
   - Create a new index named `moonscribe-test`
   - Use these settings:
     - **Dimensions:** 3072 (for `text-embedding-3-large`)
     - **Metric:** cosine
     - **Pod Type:** s1.x1 (or p1.x1 for production)

3. **Test the new index:**
   - Upload a test document
   - Verify it works correctly

### Option 2: Migrate Existing Data

If you have data in `worklab-test` that you want to keep:

1. **Create the new index:**
   ```bash
   # Using Pinecone CLI or Console
   # Create: moonscribe-test with same dimensions (3072)
   ```

2. **Export data from old index:**
   ```typescript
   // Migration script (create as scripts/migrate-index.ts)
   import { Pinecone } from '@pinecone-database/pinecone';
   
   const oldPinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
   const newPinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
   
   const oldIndex = oldPinecone.index('worklab-test');
   const newIndex = newPinecone.index('moonscribe-test');
   
   // Fetch all vectors (in batches)
   async function migrateIndex() {
     // Note: This is a simplified example
     // You'll need to handle pagination for large datasets
     const queryResponse = await oldIndex.query({
       vector: new Array(3072).fill(0), // Dummy vector
       topK: 10000,
       includeMetadata: true,
     });
     
     const vectors = queryResponse.matches.map(match => ({
       id: match.id,
       values: match.values!,
       metadata: match.metadata,
     }));
     
     // Upsert to new index
     await newIndex.upsert(vectors);
     console.log(`Migrated ${vectors.length} vectors`);
   }
   ```

3. **Update `.env.local`:**
   ```env
   PINECONE_INDEX=moonscribe-test
   ```

4. **Verify migration:**
   - Test queries work
   - Check document counts match
   - Delete old index once confirmed

### Option 3: Keep Old Name Temporarily

If you want to keep using `worklab-test` for now:

- No changes needed
- Update later when ready
- The index name doesn't affect functionality

---

## 🗄️ Supabase Setup

### 1. Create Database Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collections (folders for organizing documents)
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents metadata
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  chunk_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing', -- processing, ready, error
  metadata JSONB, -- Additional metadata (page count, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  sources JSONB, -- Array of source citations
  model_used TEXT, -- Which LLM model was used
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 6), -- Estimated cost in USD
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API keys (encrypted client-side, stored encrypted)
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google', etc.
  key_name TEXT, -- User-friendly name
  encrypted_key TEXT NOT NULL, -- Encrypted API key
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT,
  operation TEXT NOT NULL, -- 'embedding', 'chat', 'summary', etc.
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_collection_id ON public.documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own collections" ON public.collections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own documents" ON public.documents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own conversations" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own messages" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own API keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage logs" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);
```

### 2. Set Up Supabase Client

Install Supabase client:
```bash
npm install @supabase/supabase-js
```

### 3. Environment Variables

Your `.env.local` should include:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

---

## 📝 Migration Checklist

- [ ] Update Pinecone index name in `.env.local`
- [ ] Create new Pinecone index (if migrating)
- [ ] Run Supabase SQL schema
- [ ] Install Supabase client library
- [ ] Verify Supabase connection
- [ ] Test document upload with new schema
- [ ] Test chat history persistence
- [ ] Verify RLS policies work correctly

---

## 🚀 Next Steps

After migration:
1. Implement user authentication
2. Update API routes to use Supabase
3. Add document metadata storage
4. Implement chat history
5. Add usage tracking

