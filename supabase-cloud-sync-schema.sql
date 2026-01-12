-- =====================================================
-- MOONSCRIBE CLOUD SYNC SCHEMA
-- Run this in Supabase SQL Editor
-- This enables cloud sync for projects, insights, and conversations
-- 
-- PREREQUISITES:
-- 1. Run supabase-teams-schema.sql first (creates teams table)
-- 2. Run supabase-credits-schema.sql (creates credits table)
-- =====================================================

-- Projects table (cloud sync)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID, -- NULL = personal, set = shared with team (FK added after teams table exists)
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#7c3aed',
  tags TEXT[] DEFAULT '{}',
  is_shared BOOLEAN DEFAULT false, -- Whether shared with team
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project content (sources/metadata)
CREATE TABLE IF NOT EXISTS public.project_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL, -- Original content ID from localStorage
  type TEXT NOT NULL, -- 'document', 'image', 'audio', 'youtube', 'web', 'note'
  title TEXT NOT NULL,
  filename TEXT,
  chunks_processed INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT false,
  metadata JSONB, -- Additional metadata (fileType, fileSize, transcript, etc.)
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, content_id)
);

-- Insights table (cloud sync)
CREATE TABLE IF NOT EXISTS public.insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID, -- NULL = personal, set = shared with team (FK added after teams table exists)
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  original_query TEXT NOT NULL,
  content TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]', -- Array of source objects
  tags TEXT[] DEFAULT '{}',
  is_starred BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false, -- Whether shared with team
  share_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table (cloud sync)
CREATE TABLE IF NOT EXISTS public.conversations_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID, -- NULL = personal, set = shared with team (FK added after teams table exists)
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]', -- Array of message objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, project_id) -- One conversation per user per project
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON public.projects(team_id);
CREATE INDEX IF NOT EXISTS idx_project_content_project_id ON public.project_content(project_id);
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON public.insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_team_id ON public.insights(team_id);
CREATE INDEX IF NOT EXISTS idx_insights_project_id ON public.insights(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_sync_user_id ON public.conversations_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_sync_team_id ON public.conversations_sync(team_id);
CREATE INDEX IF NOT EXISTS idx_conversations_sync_project_id ON public.conversations_sync(project_id);

-- Add foreign key constraint for team_id (only if teams table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
    ALTER TABLE public.projects 
      ADD CONSTRAINT fk_projects_team_id 
      FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
    
    ALTER TABLE public.insights 
      ADD CONSTRAINT fk_insights_team_id 
      FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
    
    ALTER TABLE public.conversations_sync 
      ADD CONSTRAINT fk_conversations_sync_team_id 
      FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view project content" ON public.project_content;
DROP POLICY IF EXISTS "Users can manage project content" ON public.project_content;
DROP POLICY IF EXISTS "Users can view their insights" ON public.insights;
DROP POLICY IF EXISTS "Users can create insights" ON public.insights;
DROP POLICY IF EXISTS "Users can update their insights" ON public.insights;
DROP POLICY IF EXISTS "Users can delete their insights" ON public.insights;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations_sync;
DROP POLICY IF EXISTS "Users can manage their conversations" ON public.conversations_sync;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations_sync ENABLE ROW LEVEL SECURITY;

-- Projects policies
-- Users can see their own projects and shared team projects
CREATE POLICY "Users can view their projects"
  ON public.projects FOR SELECT
  USING (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND (
      -- Check if user is a member of this team (if team_members table exists)
      EXISTS (SELECT 1 FROM public.team_members WHERE team_id = projects.team_id AND user_id = auth.uid())
      OR
      -- Check if user owns this team (if teams table exists)
      EXISTS (SELECT 1 FROM public.teams WHERE id = projects.team_id AND owner_id = auth.uid())
    ))
  );

-- Users can create their own projects
CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own projects and shared team projects (if owner)
CREATE POLICY "Users can update their projects"
  ON public.projects FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.teams WHERE id = projects.team_id AND owner_id = auth.uid()
    ))
  );

-- Users can delete their own projects
CREATE POLICY "Users can delete their projects"
  ON public.projects FOR DELETE
  USING (user_id = auth.uid());

-- Project content policies (same as projects)
CREATE POLICY "Users can view project content"
  ON public.project_content FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects WHERE
        projects.id = project_content.project_id AND (
          user_id = auth.uid() OR
          (team_id IS NOT NULL AND (
            EXISTS (SELECT 1 FROM public.team_members WHERE team_id = projects.team_id AND user_id = auth.uid())
            OR
            EXISTS (SELECT 1 FROM public.teams WHERE id = projects.team_id AND owner_id = auth.uid())
          ))
        )
    )
  );

CREATE POLICY "Users can manage project content"
  ON public.project_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects WHERE
        projects.id = project_content.project_id AND (
          user_id = auth.uid() OR
          (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.teams WHERE id = projects.team_id AND owner_id = auth.uid()
          ))
        )
    )
  );

-- Insights policies (same pattern as projects)
CREATE POLICY "Users can view their insights"
  ON public.insights FOR SELECT
  USING (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.team_members WHERE team_id = insights.team_id AND user_id = auth.uid())
      OR
      EXISTS (SELECT 1 FROM public.teams WHERE id = insights.team_id AND owner_id = auth.uid())
    ))
  );

CREATE POLICY "Users can create insights"
  ON public.insights FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their insights"
  ON public.insights FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.teams WHERE id = insights.team_id AND owner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete their insights"
  ON public.insights FOR DELETE
  USING (user_id = auth.uid());

-- Conversations policies (same pattern)
CREATE POLICY "Users can view their conversations"
  ON public.conversations_sync FOR SELECT
  USING (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.team_members WHERE team_id = conversations_sync.team_id AND user_id = auth.uid())
      OR
      EXISTS (SELECT 1 FROM public.teams WHERE id = conversations_sync.team_id AND owner_id = auth.uid())
    ))
  );

CREATE POLICY "Users can manage their conversations"
  ON public.conversations_sync FOR ALL
  USING (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.teams WHERE id = conversations_sync.team_id AND owner_id = auth.uid()
    ))
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get user's team ID (if in a team)
-- Note: This function will only work if teams table exists (run supabase-teams-schema.sql first)
CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Check if teams table exists first
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
    RETURN NULL;
  END IF;
  
  -- Check if user owns a team
  SELECT id INTO v_team_id
  FROM public.teams
  WHERE owner_id = auth.uid()
  LIMIT 1;
  
  -- If not owner, check if member
  IF v_team_id IS NULL THEN
    SELECT team_id INTO v_team_id
    FROM public.team_members
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This schema enables cloud sync for paid users and team members
-- 2. Free users continue using localStorage (no changes)
-- 3. Team sharing: Projects/insights with team_id are visible to all team members
-- 4. Personal projects: team_id = NULL, only visible to owner
-- 5. Migration: Existing localStorage data can be migrated via API endpoints
