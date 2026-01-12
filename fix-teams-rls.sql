-- Fix infinite recursion in teams RLS policies
-- Run this in Supabase SQL Editor

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their teams" ON teams;
DROP POLICY IF EXISTS "Users can view team members" ON team_members;

-- Recreate teams SELECT policy WITHOUT recursion
-- Users can see teams they own OR teams they're trying to join (by team_code)
-- This allows users to look up teams by code for joining
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    owner_id = auth.uid()
    OR
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Recreate team_members SELECT policy WITHOUT recursion
-- Users can see members of teams they own OR teams they're members of
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );
