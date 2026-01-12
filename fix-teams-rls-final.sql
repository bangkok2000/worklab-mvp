-- FINAL FIX: Remove ALL recursion from teams RLS policies
-- Run this in Supabase SQL Editor

-- Drop ALL existing policies that might cause recursion
-- Drop all policies on teams table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teams') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON teams';
  END LOOP;
END $$;

-- Drop all policies on team_members table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_members') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON team_members';
  END LOOP;
END $$;

-- Teams SELECT: Only check ownership, NO subquery to team_members
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (owner_id = auth.uid());

-- Teams INSERT: Only check ownership
CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Teams UPDATE: Only check ownership
CREATE POLICY "Owners can update teams"
  ON teams FOR UPDATE
  USING (owner_id = auth.uid());

-- Teams DELETE: Only check ownership
CREATE POLICY "Owners can delete teams"
  ON teams FOR DELETE
  USING (owner_id = auth.uid());

-- Team members SELECT: Check membership OR ownership (but ownership check doesn't query team_members)
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- Team members INSERT: Allow users to add themselves OR team owners to add anyone
-- NO subquery to team_members to avoid recursion
CREATE POLICY "Users can join teams or owners can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- Team members DELETE: Users can remove themselves OR owners can remove anyone
CREATE POLICY "Users can leave teams or owners can remove members"
  ON team_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- Function to lookup team by code (for joining)
CREATE OR REPLACE FUNCTION lookup_team_by_code(p_team_code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  owner_id UUID,
  team_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.owner_id, t.team_code
  FROM teams t
  WHERE t.team_code = p_team_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
