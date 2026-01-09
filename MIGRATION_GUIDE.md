# MoonScribe Migration Guide

## 🗄️ Database Setup (Supabase)

### Step 1: Run Base Schema

Run this SQL in your Supabase SQL Editor:

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
  status TEXT DEFAULT 'processing',
  metadata JSONB,
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
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  sources JSONB,
  model_used TEXT,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can manage own collections" ON public.collections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own documents" ON public.documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own messages" ON public.messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
```

### Step 2: Run Credits Schema

Run `supabase-credits-schema.sql` OR this SQL:

```sql
-- Credits balance per user
CREATE TABLE IF NOT EXISTS public.credits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER DEFAULT 0,
  lifetime_purchased INTEGER DEFAULT 0,
  lifetime_used INTEGER DEFAULT 0,
  free_credits_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions (audit log)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference_id TEXT,
  reference_type TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit packages (purchasable)
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_price_id TEXT,
  description TEXT,
  badge TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit costs per action
CREATE TABLE IF NOT EXISTS public.credit_costs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action TEXT NOT NULL UNIQUE,
  credits_cost INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default credit costs
INSERT INTO public.credit_costs (action, credits_cost, description) VALUES
  ('ask_gpt35', 1, 'Ask question using GPT-3.5'),
  ('ask_gpt4', 10, 'Ask question using GPT-4'),
  ('ask_gpt4o', 5, 'Ask question using GPT-4o'),
  ('ask_claude', 5, 'Ask question using Claude'),
  ('upload_document_page', 1, 'Process one page of a document'),
  ('process_youtube', 2, 'Process YouTube video'),
  ('process_web', 1, 'Process web page'),
  ('transcribe_audio_minute', 3, 'Transcribe one minute of audio'),
  ('export_insight', 0, 'Export an insight')
ON CONFLICT (action) DO NOTHING;

-- Enable RLS
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own credits" ON public.credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active packages" ON public.credit_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active costs" ON public.credit_costs FOR SELECT USING (is_active = true);

-- Auto-create credits for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.credits (user_id, balance) VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();
```

### Step 3: Run Teams Schema

Run `supabase-teams-schema.sql` OR this SQL:

```sql
-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_code TEXT UNIQUE NOT NULL,
  api_key_encrypted TEXT,
  api_provider TEXT DEFAULT 'openai',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Owners can manage their teams" ON public.teams
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Team members can view team info" ON public.teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
    OR owner_id = auth.uid()
  );

-- RLS Policies for team_members
CREATE POLICY "Owners can manage team members" ON public.team_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Members can view their memberships" ON public.team_members
  FOR SELECT USING (user_id = auth.uid());

-- Function to generate unique team code
CREATE OR REPLACE FUNCTION public.generate_team_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'MOON-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FOR 4)) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FOR 4));
    SELECT EXISTS (SELECT 1 FROM public.teams WHERE team_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Step 4: Insert Credit Packages

After creating your Stripe products, update with real price IDs:

```sql
INSERT INTO public.credit_packages (name, credits, price_cents, stripe_price_id, description, badge, sort_order)
VALUES 
  ('Basic', 500, 500, 'price_XXXXX', '500 credits for light users', NULL, 1),
  ('Standard', 1500, 1200, 'price_XXXXX', '1500 credits for regular use', 'Popular', 2),
  ('Pro', 5000, 3500, 'price_XXXXX', '5000 credits for heavy users', 'Best Value', 3);
```

---

## 🔑 Environment Variables

### Required for Vercel

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Pinecone
PINECONE_API_KEY=xxx-xxx-xxx
PINECONE_INDEX=moonscribe

# OpenAI (for Credits mode)
OPENAI_API_KEY=sk-xxx

# Team API Key Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_SECRET=your-64-character-hex-string

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## 💳 Stripe Setup

### 1. Create Account
- Sign up at [stripe.com](https://stripe.com)
- Complete business verification

### 2. Create Products
In Stripe Dashboard → Products:
- **Basic** - $5.00 (500 credits)
- **Standard** - $12.00 (1500 credits)
- **Pro** - $35.00 (5000 credits)

Copy each Price ID (starts with `price_`)

### 3. Create Webhook
In Stripe Dashboard → Developers → Webhooks:
- Endpoint URL: `https://your-app.vercel.app/api/stripe/webhook`
- Events to send:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
- Copy the webhook secret (starts with `whsec_`)

### 4. Update Database
Update `credit_packages` table with real Stripe price IDs

---

## 🔄 Pinecone Setup

### Create Index
1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create new index named `moonscribe`
3. Settings:
   - **Dimensions**: 3072 (for text-embedding-3-large)
   - **Metric**: cosine
   - **Pod Type**: s1.x1 (starter) or p1.x1 (production)

---

## ✅ Pre-Launch Checklist

### Database
- [ ] Run base schema SQL
- [ ] Run credits schema SQL
- [ ] Run teams schema SQL
- [ ] Insert credit packages with Stripe price IDs
- [ ] Verify RLS policies are working

### External Services
- [ ] Create OpenAI organization account
- [ ] Create Pinecone index
- [ ] Create Stripe account and products
- [ ] Create Stripe webhook

### Vercel
- [ ] Add all environment variables
- [ ] Deploy and test
- [ ] Verify Stripe webhook receives events

### Testing
- [ ] Sign up new user → gets 100 free credits
- [ ] Upload PDF → credits deducted
- [ ] Ask question → credits deducted
- [ ] Buy credits → Stripe checkout works
- [ ] Create team → code generated
- [ ] Join team → can use team's API key

---

*Last Updated: January 2026*
