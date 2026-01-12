-- Fix teams RLS to allow joining by team code
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their teams" ON teams;
DROP POLICY IF EXISTS "Users can view team members" ON team_members;

-- Recreate teams SELECT policy
-- Users can see teams they own OR teams they're members of
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    owner_id = auth.uid()
    OR
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Recreate team_members SELECT policy
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- Fix INSERT policy to avoid recursion
-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Owners can add members" ON team_members;

-- Recreate INSERT policy WITHOUT recursion
-- Users can add themselves to teams (for joining)
-- OR team owners can add members (but check ownership directly, not through team_members)
CREATE POLICY "Users can join teams or owners can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    -- User is adding themselves (for joining)
    user_id = auth.uid()
    OR
    -- User owns the team (check teams table directly, no subquery to team_members)
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- Create a function to lookup team by code (bypasses RLS for joining)
-- This allows users to find teams by code even if they're not members yet
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
