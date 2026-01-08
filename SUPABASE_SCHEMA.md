# MoonScribe - Supabase Database Schema

## 📊 Entity Relationship Diagram

```
┌─────────────┐
│   profiles  │ (extends auth.users)
└──────┬──────┘
       │
       ├───┐
       │   │
       │   ├──────────────┐
       │   │              │
┌──────▼───▼──┐    ┌──────▼──────┐
│ collections │    │  documents  │
└──────┬──────┘    └──────┬──────┘
       │                  │
       │                  │
┌──────▼──────┐    ┌──────▼──────┐
│conversations│    │  api_keys   │
└──────┬──────┘    └──────┬──────┘
       │                  │
┌──────▼──────┐    ┌──────▼──────┐
│  messages   │    │ usage_logs  │
└─────────────┘    └─────────────┘
```

## 📋 Table Descriptions

### 1. `profiles`
Extends Supabase's built-in `auth.users` table with additional user information.

**Columns:**
- `id` (UUID, PK) - References `auth.users(id)`
- `email` (TEXT) - User email
- `full_name` (TEXT) - User's full name
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Use Cases:**
- Store user preferences
- Display user information
- Link to other user data

---

### 2. `collections`
Organize documents into folders/collections.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles)
- `name` (TEXT) - Collection name
- `description` (TEXT) - Optional description
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Use Cases:**
- Group related documents (e.g., "Research Papers", "Work Docs")
- Filter documents by collection
- Share collections with team members (future)

---

### 3. `documents`
Metadata for uploaded documents.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles)
- `collection_id` (UUID, FK → collections, nullable)
- `filename` (TEXT) - Stored filename
- `original_filename` (TEXT) - Original upload name
- `file_size` (BIGINT) - Size in bytes
- `file_type` (TEXT) - MIME type (e.g., "application/pdf")
- `chunk_count` (INTEGER) - Number of chunks in Pinecone
- `status` (TEXT) - 'processing', 'ready', 'error'
- `metadata` (JSONB) - Flexible metadata:
  ```json
  {
    "page_count": 25,
    "word_count": 5000,
    "language": "en",
    "extracted_at": "2024-01-01T00:00:00Z"
  }
  ```
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Use Cases:**
- List user's documents
- Track document processing status
- Store document metadata
- Link documents to collections

---

### 4. `conversations`
Chat conversation sessions.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles)
- `collection_id` (UUID, FK → collections, nullable) - Which documents are in context
- `title` (TEXT) - Auto-generated or user-set title
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Use Cases:**
- Group related messages
- Resume previous conversations
- Organize chat history

---

### 5. `messages`
Individual chat messages.

**Columns:**
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → conversations)
- `role` (TEXT) - 'user' or 'assistant'
- `content` (TEXT) - Message content
- `sources` (JSONB) - Array of source citations:
  ```json
  [
    {
      "number": 1,
      "source": "document.pdf",
      "relevance": 95,
      "page": 12,
      "excerpt": "..."
    }
  ]
  ```
- `model_used` (TEXT) - Which LLM model (e.g., "gpt-4-turbo")
- `tokens_used` (INTEGER) - Token count
- `cost_estimate` (DECIMAL) - Estimated cost in USD
- `created_at` (TIMESTAMP)

**Use Cases:**
- Display chat history
- Resume conversations
- Track costs per conversation
- Analyze usage patterns

---

### 6. `api_keys`
User's API keys (encrypted).

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles)
- `provider` (TEXT) - 'openai', 'anthropic', 'google', 'ollama'
- `key_name` (TEXT) - User-friendly name (e.g., "Work OpenAI Key")
- `encrypted_key` (TEXT) - Encrypted API key
- `is_active` (BOOLEAN) - Whether key is currently active
- `usage_count` (INTEGER) - Number of times used
- `last_used_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)

**Security Notes:**
- Keys should be encrypted client-side before storage
- Use AES-256 encryption
- Never log or expose keys
- Consider using Supabase Vault for additional security

**Use Cases:**
- Store user's API keys
- Track key usage
- Manage multiple keys per provider
- Enable/disable keys

---

### 7. `usage_logs`
Track API usage and costs.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles)
- `api_key_id` (UUID, FK → api_keys, nullable)
- `provider` (TEXT) - 'openai', 'anthropic', etc.
- `model` (TEXT) - Model name (e.g., "gpt-4-turbo")
- `operation` (TEXT) - 'embedding', 'chat', 'summary', 'flashcard', etc.
- `tokens_used` (INTEGER)
- `cost_estimate` (DECIMAL) - Estimated cost
- `created_at` (TIMESTAMP)

**Use Cases:**
- Cost tracking and reporting
- Usage analytics
- Budget alerts
- Provider comparison

---

## 🔒 Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- No cross-user data leakage
- Proper authentication required

**Policy Pattern:**
```sql
CREATE POLICY "Users can manage own [table]" ON public.[table]
  FOR ALL USING (auth.uid() = user_id);
```

---

## 📈 Indexes

Performance indexes on:
- `documents.user_id` - Fast user document queries
- `documents.collection_id` - Fast collection filtering
- `conversations.user_id` - Fast conversation listing
- `messages.conversation_id` - Fast message retrieval
- `usage_logs.user_id` - Fast usage queries
- `usage_logs.created_at` - Time-based analytics

---

## 🔄 Future Extensions

### Sharing & Collaboration
```sql
-- Document sharing
CREATE TABLE document_shares (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  shared_with_user_id UUID REFERENCES profiles(id),
  permission TEXT, -- 'read', 'write'
  created_at TIMESTAMP
);

-- Team workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name TEXT,
  created_by UUID REFERENCES profiles(id)
);

CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID REFERENCES profiles(id),
  role TEXT, -- 'owner', 'admin', 'member'
  PRIMARY KEY (workspace_id, user_id)
);
```

### Advanced Features
```sql
-- Study sessions (for flashcards)
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  collection_id UUID REFERENCES collections(id),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  cards_studied INTEGER,
  cards_mastered INTEGER
);

-- Document annotations
CREATE TABLE annotations (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  user_id UUID REFERENCES profiles(id),
  content TEXT,
  position JSONB, -- Page, coordinates, etc.
  created_at TIMESTAMP
);
```

---

## 🎯 Query Examples

### Get user's documents with collection info
```sql
SELECT 
  d.*,
  c.name as collection_name
FROM documents d
LEFT JOIN collections c ON d.collection_id = c.id
WHERE d.user_id = auth.uid()
ORDER BY d.created_at DESC;
```

### Get conversation with messages
```sql
SELECT 
  c.*,
  json_agg(
    json_build_object(
      'id', m.id,
      'role', m.role,
      'content', m.content,
      'created_at', m.created_at
    ) ORDER BY m.created_at
  ) as messages
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE c.user_id = auth.uid()
GROUP BY c.id;
```

### Get usage stats for current month
```sql
SELECT 
  provider,
  model,
  operation,
  SUM(tokens_used) as total_tokens,
  SUM(cost_estimate) as total_cost,
  COUNT(*) as operation_count
FROM usage_logs
WHERE user_id = auth.uid()
  AND created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY provider, model, operation
ORDER BY total_cost DESC;
```

---

*This schema supports the core MoonScribe features and is designed to scale with future enhancements.*

