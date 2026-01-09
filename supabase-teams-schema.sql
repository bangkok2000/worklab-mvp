-- =====================================================
-- MOONSCRIBE TEAMS SCHEMA
-- Run this in Supabase SQL Editor
-- =====================================================

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_code TEXT UNIQUE NOT NULL,
  api_key_encrypted TEXT,  -- Encrypted OpenAI API key
  api_provider TEXT DEFAULT 'openai',  -- 'openai', 'anthropic', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_code ON teams(team_code);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Teams policies
-- Users can see teams they own or are members of
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Only owners can insert teams
CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only owners can update their teams
CREATE POLICY "Owners can update teams"
  ON teams FOR UPDATE
  USING (owner_id = auth.uid());

-- Only owners can delete their teams
CREATE POLICY "Owners can delete teams"
  ON teams FOR DELETE
  USING (owner_id = auth.uid());

-- Team members policies
-- Users can see members of teams they belong to
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Team owners/admins can add members
CREATE POLICY "Owners can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()) OR
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Team owners can remove members
CREATE POLICY "Owners can remove members"
  ON team_members FOR DELETE
  USING (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()) OR
    user_id = auth.uid()  -- Users can remove themselves
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate unique team code (MOON-XXXX-XXXX format)
CREATE OR REPLACE FUNCTION generate_team_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- No confusing chars (0/O, 1/I/L)
  code TEXT := 'MOON-';
  i INT;
BEGIN
  FOR i IN 1..4 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  code := code || '-';
  FOR i IN 1..4 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to join a team using team code
CREATE OR REPLACE FUNCTION join_team_by_code(p_team_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_team_id UUID;
  v_team_name TEXT;
  v_existing UUID;
BEGIN
  -- Find the team
  SELECT id, name INTO v_team_id, v_team_name
  FROM teams
  WHERE team_code = p_team_code;
  
  IF v_team_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid team code');
  END IF;
  
  -- Check if already a member
  SELECT id INTO v_existing
  FROM team_members
  WHERE team_id = v_team_id AND user_id = auth.uid();
  
  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this team');
  END IF;
  
  -- Add as member
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, auth.uid(), 'member');
  
  RETURN json_build_object(
    'success', true,
    'team_id', v_team_id,
    'team_name', v_team_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's team (returns team with decrypted status)
CREATE OR REPLACE FUNCTION get_user_team()
RETURNS JSON AS $$
DECLARE
  v_team RECORD;
  v_role TEXT;
  v_member_count INT;
BEGIN
  -- First check if user owns a team
  SELECT t.*, 'owner' as role INTO v_team
  FROM teams t
  WHERE t.owner_id = auth.uid()
  LIMIT 1;
  
  -- If not owner, check if member
  IF v_team.id IS NULL THEN
    SELECT t.*, tm.role INTO v_team
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  IF v_team.id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Count members
  SELECT COUNT(*) INTO v_member_count
  FROM team_members
  WHERE team_id = v_team.id;
  
  -- Add 1 for owner
  v_member_count := v_member_count + 1;
  
  RETURN json_build_object(
    'id', v_team.id,
    'name', v_team.name,
    'team_code', CASE WHEN v_team.owner_id = auth.uid() THEN v_team.team_code ELSE NULL END,
    'has_api_key', v_team.api_key_encrypted IS NOT NULL,
    'api_provider', v_team.api_provider,
    'role', v_team.role,
    'member_count', v_member_count,
    'created_at', v_team.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- IMPORTANT: Add ENCRYPTION_SECRET to Vercel env vars
-- This will be used server-side to encrypt/decrypt API keys
-- Generate with: openssl rand -base64 32
-- =====================================================
