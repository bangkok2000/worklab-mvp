-- MoonScribe Credits System Schema
-- Run this SQL in your Supabase SQL Editor AFTER the main schema
-- This adds credits tracking for the hybrid pricing model

-- ============================================
-- CREDITS TABLE - User Credit Balances
-- ============================================
CREATE TABLE IF NOT EXISTS public.credits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER DEFAULT 0 NOT NULL,
  lifetime_purchased INTEGER DEFAULT 0 NOT NULL, -- Total credits ever purchased
  lifetime_used INTEGER DEFAULT 0 NOT NULL,      -- Total credits ever used
  free_credits_claimed BOOLEAN DEFAULT FALSE,    -- Whether user claimed free starter credits
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON public.credits(user_id);

-- ============================================
-- CREDIT TRANSACTIONS - Audit Trail
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Transaction details
  amount INTEGER NOT NULL,                        -- Positive = add, Negative = deduct
  balance_after INTEGER NOT NULL,                 -- Balance after this transaction
  
  -- Transaction type
  type TEXT NOT NULL CHECK (type IN (
    'purchase',           -- Bought credits via Stripe
    'free_starter',       -- Free starter credits (one-time)
    'bonus',              -- Promotional bonus
    'refund',             -- Refund from failed operation
    'ask_gpt35',          -- Used for GPT-3.5 question
    'ask_gpt4',           -- Used for GPT-4 question
    'ask_claude',         -- Used for Claude question
    'upload_document',    -- Used for document upload/embedding
    'process_youtube',    -- Used for YouTube processing
    'process_web',        -- Used for web page processing
    'transcribe_audio',   -- Used for audio transcription
    'admin_adjustment'    -- Manual adjustment by admin
  )),
  
  -- Reference to what triggered this transaction
  reference_id TEXT,                              -- e.g., Stripe payment ID, conversation ID
  reference_type TEXT,                            -- e.g., 'stripe_payment', 'conversation', 'document'
  
  -- Metadata
  description TEXT,                               -- Human-readable description
  metadata JSONB,                                 -- Additional data (model used, tokens, etc.)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);

-- ============================================
-- CREDIT PACKAGES - Available for Purchase
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Package details
  name TEXT NOT NULL,                             -- e.g., "Basic", "Standard", "Pro"
  credits INTEGER NOT NULL,                       -- Number of credits in package
  price_cents INTEGER NOT NULL,                   -- Price in cents (e.g., 500 = $5.00)
  currency TEXT DEFAULT 'usd',                    -- Currency code
  
  -- Stripe integration
  stripe_price_id TEXT,                           -- Stripe Price ID for checkout
  
  -- Display
  description TEXT,                               -- Package description
  badge TEXT,                                     -- e.g., "Most Popular", "Best Value"
  sort_order INTEGER DEFAULT 0,                   -- Display order
  is_active BOOLEAN DEFAULT TRUE,                 -- Whether package is available
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREDIT COSTS - Cost Per Action (Config)
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_costs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  action TEXT UNIQUE NOT NULL,                    -- Action identifier
  credits_cost INTEGER NOT NULL,                  -- Cost in credits
  description TEXT,                               -- Human-readable description
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default credit costs
INSERT INTO public.credit_costs (action, credits_cost, description) VALUES
  ('ask_gpt35', 1, 'Ask a question using GPT-3.5 (~75% margin)'),
  ('ask_gpt4', 10, 'Ask a question using GPT-4 (~60% margin)'),
  ('ask_gpt4o', 5, 'Ask a question using GPT-4o (~75% margin)'),
  ('ask_claude', 5, 'Ask a question using Claude (~70% margin)'),
  ('upload_document_page', 1, 'Upload document per page (~99% margin)'),
  ('process_youtube', 2, 'Process YouTube video transcript'),
  ('process_web', 1, 'Process web page'),
  ('transcribe_audio_minute', 3, 'Transcribe audio per minute (Whisper)'),
  ('export_insight', 0, 'Export insight (free)')
ON CONFLICT (action) DO UPDATE SET 
  credits_cost = EXCLUDED.credits_cost,
  description = EXCLUDED.description;

-- Insert default credit packages
INSERT INTO public.credit_packages (name, credits, price_cents, description, badge, sort_order) VALUES
  ('Basic', 500, 500, 'Perfect for light users', NULL, 1),
  ('Standard', 1500, 1200, 'Great for regular research', 'Most Popular', 2),
  ('Pro', 5000, 3500, 'For heavy users and teams', 'Best Value', 3)
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all credits tables
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_costs ENABLE ROW LEVEL SECURITY;

-- Credits: Users can only see their own balance
CREATE POLICY "Users can view own credits"
  ON public.credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON public.credits FOR UPDATE
  USING (auth.uid() = user_id);

-- Note: INSERT is handled by service role when user signs up
CREATE POLICY "Service role can insert credits"
  ON public.credits FOR INSERT
  WITH CHECK (true);

-- Credit Transactions: Users can only see their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Note: INSERT is handled by service role only
CREATE POLICY "Service role can insert transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (true);

-- Credit Packages: Anyone can view active packages
CREATE POLICY "Anyone can view active packages"
  ON public.credit_packages FOR SELECT
  USING (is_active = true);

-- Credit Costs: Anyone can view active costs
CREATE POLICY "Anyone can view active costs"
  ON public.credit_costs FOR SELECT
  USING (is_active = true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_credits_updated_at
  BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_packages_updated_at
  BEFORE UPDATE ON public.credit_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_costs_updated_at
  BEFORE UPDATE ON public.credit_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create credits record when user signs up
CREATE OR REPLACE FUNCTION handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.credits (user_id, balance, free_credits_claimed)
  VALUES (NEW.id, 0, FALSE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create credits for new profiles
CREATE TRIGGER on_profile_created_add_credits
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_credits();

-- ============================================
-- HELPER FUNCTION: Claim Free Starter Credits
-- ============================================
CREATE OR REPLACE FUNCTION claim_free_starter_credits(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_already_claimed BOOLEAN;
  v_starter_credits INTEGER := 100; -- Free starter credits amount
BEGIN
  -- Check if already claimed
  SELECT free_credits_claimed INTO v_already_claimed
  FROM public.credits
  WHERE user_id = p_user_id;

  IF v_already_claimed THEN
    RETURN FALSE; -- Already claimed
  END IF;

  -- Update credits balance
  UPDATE public.credits
  SET 
    balance = balance + v_starter_credits,
    free_credits_claimed = TRUE,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, type, description
  )
  SELECT 
    p_user_id,
    v_starter_credits,
    balance,
    'free_starter',
    'Welcome! Here are your free starter credits.'
  FROM public.credits
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Deduct Credits
-- ============================================
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance with lock
  SELECT balance INTO v_current_balance
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check sufficient balance
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN FALSE; -- Insufficient credits
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - p_amount;

  -- Update credits
  UPDATE public.credits
  SET 
    balance = v_new_balance,
    lifetime_used = lifetime_used + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, type, description, 
    reference_id, reference_type, metadata
  ) VALUES (
    p_user_id, -p_amount, v_new_balance, p_type, p_description,
    p_reference_id, p_reference_type, p_metadata
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Add Credits (Purchase)
-- ============================================
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$ -- Returns new balance
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Update credits
  UPDATE public.credits
  SET 
    balance = balance + p_amount,
    lifetime_purchased = CASE 
      WHEN p_type = 'purchase' THEN lifetime_purchased + p_amount 
      ELSE lifetime_purchased 
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, type, description, 
    reference_id, reference_type, metadata
  ) VALUES (
    p_user_id, p_amount, v_new_balance, p_type, p_description,
    p_reference_id, 'stripe_payment', p_metadata
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.credits TO authenticated;
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT SELECT ON public.credit_packages TO authenticated;
GRANT SELECT ON public.credit_costs TO authenticated;

-- Service role needs full access for backend operations
GRANT ALL ON public.credits TO service_role;
GRANT ALL ON public.credit_transactions TO service_role;
GRANT ALL ON public.credit_packages TO service_role;
GRANT ALL ON public.credit_costs TO service_role;
