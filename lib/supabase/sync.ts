/**
 * Cloud Sync Utilities for Projects, Insights, and Conversations
 * 
 * This module handles syncing user data to Supabase for paid users and team members.
 * Free users continue using localStorage only.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import { getSupabase } from './client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface Project {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  conversationCount: number;
  insightCount: number;
  color: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  teamId?: string | null;
  isShared?: boolean;
}

export interface Insight {
  id: string;
  title: string;
  originalQuery: string;
  content: string;
  sources: { id: string; title: string; type: string; relevance?: number }[];
  tags: string[];
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  isStarred: boolean;
  isPublic: boolean;
  isArchived: boolean;
  shareLink?: string;
  createdAt: Date;
  updatedAt: Date;
  teamId?: string | null;
  isShared?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { id: string; title: string; type: string; relevance?: number }[];
  timestamp: Date;
}

export interface Conversation {
  id: string;
  projectId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  teamId?: string | null;
}

/**
 * Check if user should use cloud sync
 * - Paid users (have credits or BYOK): YES
 * - Team members: YES
 * - Free users: NO (localStorage only)
 */
export async function shouldUseCloudSync(user: User | null, supabaseClient?: SupabaseClient): Promise<boolean> {
  if (!user) return false; // Guest users = localStorage only
  
  try {
    const supabase = supabaseClient || getSupabase();
    
    // Check if user is in a team
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();
    
    if (teamMember) return true; // Team members should sync
    
    // Check if user owns a team
    const { data: teamOwner } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (teamOwner) return true; // Team owners should sync
    
    // Check if user has credits (paid user)
    const { data: credits } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    
    if (credits && credits.balance > 0) return true; // Has credits = paid user
    
    // Check if user has any credit transactions (indicates they were a paid user)
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    
    if (transactions) return true; // Had credits before = paid user
    
    return false; // Free user = localStorage only
  } catch (error) {
    console.error('[Cloud Sync] Error checking sync eligibility:', error);
    return false; // On error, default to localStorage
  }
}

/**
 * Get user's team ID (if in a team)
 */
export async function getUserTeamId(user: User | null, supabaseClient?: SupabaseClient): Promise<string | null> {
  if (!user) return null;
  
  try {
    const supabase = supabaseClient || getSupabase();
    
    // Check if user owns a team
    const { data: ownedTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (ownedTeam) return ownedTeam.id;
    
    // Check if user is a member
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();
    
    return membership?.team_id || null;
  } catch (error) {
    console.error('[Cloud Sync] Error getting team ID:', error);
    return null;
  }
}

/**
 * Sync projects to Supabase
 */
export async function syncProjects(
  projects: Project[],
  user: User | null,
  accessToken: string,
  supabaseClient?: SupabaseClient
): Promise<void> {
  if (!user || !(await shouldUseCloudSync(user, supabaseClient))) {
    // Free user - save to localStorage only
    if (typeof window !== 'undefined') {
      localStorage.setItem('moonscribe-projects', JSON.stringify(projects));
    }
    return;
  }
  
  try {
    // Use provided client or create authenticated client
    const supabase = supabaseClient || createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    
    const teamId = await getUserTeamId(user);
    
    // Upsert all projects
    for (const project of projects) {
      const { error } = await supabase
        .from('projects')
        .upsert({
          id: project.id,
          user_id: user.id,
          team_id: teamId,
          name: project.name,
          description: project.description || null,
          color: project.color,
          tags: project.tags || [],
          is_shared: !!teamId, // Shared if in a team
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });
      
      if (error) {
        console.error(`[Cloud Sync] Error syncing project ${project.id}:`, error);
      }
    }
    
    // Also save to localStorage as cache/backup
    if (typeof window !== 'undefined') {
      localStorage.setItem('moonscribe-projects', JSON.stringify(projects));
    }
  } catch (error) {
    console.error('[Cloud Sync] Error syncing projects:', error);
    // Fallback to localStorage on error
    if (typeof window !== 'undefined') {
      localStorage.setItem('moonscribe-projects', JSON.stringify(projects));
    }
  }
}

/**
 * Load projects from Supabase (or localStorage fallback)
 */
export async function loadProjects(
  user: User | null,
  accessToken?: string,
  supabaseClient?: SupabaseClient
): Promise<Project[]> {
  if (!user || !accessToken || !(await shouldUseCloudSync(user, supabaseClient))) {
    // Free user - load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moonscribe-projects');
      if (saved) {
        const projects = JSON.parse(saved);
        return projects.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }));
      }
    }
    return [];
  }
  
  try {
    // Use provided client or create authenticated client
    const supabase = supabaseClient || createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    
    const teamId = await getUserTeamId(user);
    
    // Load user's projects and shared team projects
    let query = supabase
      .from('projects')
      .select('*')
      .or(`user_id.eq.${user.id}${teamId ? `,team_id.eq.${teamId}` : ''}`);
    
    const { data, error } = await query.order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      // No cloud data - try localStorage as fallback
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('moonscribe-projects');
        if (saved) {
          const projects = JSON.parse(saved);
          return projects.map((p: any) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          }));
        }
      }
      return [];
    }
    
    // Convert to Project format
    const projects: Project[] = data.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      documentCount: 0, // Will be calculated separately
      conversationCount: 0, // Will be calculated separately
      insightCount: 0, // Will be calculated separately
      color: p.color || '#7c3aed',
      tags: p.tags || [],
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
      teamId: p.team_id,
      isShared: p.is_shared,
    }));
    
    // Also cache in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('moonscribe-projects', JSON.stringify(projects));
    }
    
    return projects;
  } catch (error) {
    console.error('[Cloud Sync] Error loading projects:', error);
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moonscribe-projects');
      if (saved) {
        const projects = JSON.parse(saved);
        return projects.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }));
      }
    }
    return [];
  }
}

/**
 * Sync insights to Supabase
 */
export async function syncInsights(
  insights: Insight[],
  user: User | null,
  accessToken: string,
  supabaseClient?: SupabaseClient
): Promise<void> {
  if (!user || !(await shouldUseCloudSync(user, supabaseClient))) {
    // Free user - save to localStorage only
    if (typeof window !== 'undefined') {
      const dataToSave = {
        version: 2,
        initialized: true,
        insights: insights,
      };
      localStorage.setItem('moonscribe_insights_v2', JSON.stringify(dataToSave));
    }
    return;
  }
  
  try {
    // Use provided client or create authenticated client
    const supabase = supabaseClient || createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    
    const teamId = await getUserTeamId(user);
    
    // Upsert all insights
    for (const insight of insights) {
      const { error } = await supabase
        .from('insights')
        .upsert({
          id: insight.id,
          user_id: user.id,
          team_id: teamId,
          project_id: insight.projectId || null,
          title: insight.title,
          original_query: insight.originalQuery,
          content: insight.content,
          sources: insight.sources,
          tags: insight.tags || [],
          is_starred: insight.isStarred,
          is_public: insight.isPublic,
          is_archived: insight.isArchived,
          is_shared: !!teamId, // Shared if in a team
          share_link: insight.shareLink || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });
      
      if (error) {
        console.error(`[Cloud Sync] Error syncing insight ${insight.id}:`, error);
      }
    }
    
    // Also save to localStorage as cache/backup
    if (typeof window !== 'undefined') {
      const dataToSave = {
        version: 2,
        initialized: true,
        insights: insights,
      };
      localStorage.setItem('moonscribe_insights_v2', JSON.stringify(dataToSave));
    }
  } catch (error) {
    console.error('[Cloud Sync] Error syncing insights:', error);
    // Fallback to localStorage on error
    if (typeof window !== 'undefined') {
      const dataToSave = {
        version: 2,
        initialized: true,
        insights: insights,
      };
      localStorage.setItem('moonscribe_insights_v2', JSON.stringify(dataToSave));
    }
  }
}

/**
 * Load insights from Supabase (or localStorage fallback)
 */
export async function loadInsights(
  user: User | null,
  accessToken?: string,
  supabaseClient?: SupabaseClient
): Promise<Insight[]> {
  if (!user || !accessToken || !(await shouldUseCloudSync(user, supabaseClient))) {
    // Free user - load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moonscribe_insights_v2');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.insights) {
          return data.insights.map((i: any) => ({
            ...i,
            createdAt: new Date(i.createdAt),
            updatedAt: new Date(i.updatedAt),
          }));
        }
      }
    }
    return [];
  }
  
  try {
    // Use provided client or create authenticated client
    const supabase = supabaseClient || createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    
    const teamId = await getUserTeamId(user);
    
    // Load user's insights and shared team insights
    let query = supabase
      .from('insights')
      .select('*')
      .or(`user_id.eq.${user.id}${teamId ? `,team_id.eq.${teamId}` : ''}`);
    
    const { data, error } = await query.order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      // No cloud data - try localStorage as fallback
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('moonscribe_insights_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.insights) {
            return parsed.insights.map((i: any) => ({
              ...i,
              createdAt: new Date(i.createdAt),
              updatedAt: new Date(i.updatedAt),
            }));
          }
        }
      }
      return [];
    }
    
    // Convert to Insight format
    const insights: Insight[] = data.map((i: any) => ({
      id: i.id,
      title: i.title,
      originalQuery: i.original_query,
      content: i.content,
      sources: i.sources || [],
      tags: i.tags || [],
      projectId: i.project_id,
      isStarred: i.is_starred,
      isPublic: i.is_public,
      isArchived: i.is_archived,
      shareLink: i.share_link,
      createdAt: new Date(i.created_at),
      updatedAt: new Date(i.updated_at),
      teamId: i.team_id,
      isShared: i.is_shared,
    }));
    
    // Also cache in localStorage
    if (typeof window !== 'undefined') {
      const dataToSave = {
        version: 2,
        initialized: true,
        insights: insights,
      };
      localStorage.setItem('moonscribe_insights_v2', JSON.stringify(dataToSave));
    }
    
    return insights;
  } catch (error) {
    console.error('[Cloud Sync] Error loading insights:', error);
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moonscribe_insights_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.insights) {
          return parsed.insights.map((i: any) => ({
            ...i,
            createdAt: new Date(i.createdAt),
            updatedAt: new Date(i.updatedAt),
          }));
        }
      }
    }
    return [];
  }
}

/**
 * Sync conversation to Supabase
 */
export async function syncConversation(
  projectId: string,
  messages: Message[],
  user: User | null,
  accessToken: string,
  supabaseClient?: SupabaseClient
): Promise<void> {
  if (!user || !(await shouldUseCloudSync(user, supabaseClient))) {
    // Free user - save to localStorage only
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `moonscribe-project-${projectId}-conversations`,
        JSON.stringify(messages)
      );
    }
    return;
  }
  
  try {
    // Use provided client or create authenticated client
    const supabase = supabaseClient || createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    
    const teamId = await getUserTeamId(user);
    
    // Upsert conversation
    const { error } = await supabase
      .from('conversations_sync')
      .upsert({
        user_id: user.id,
        team_id: teamId,
        project_id: projectId,
        messages: messages.map(m => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        })),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,project_id',
      });
    
    if (error) {
      console.error(`[Cloud Sync] Error syncing conversation for project ${projectId}:`, error);
    }
    
    // Also save to localStorage as cache/backup
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `moonscribe-project-${projectId}-conversations`,
        JSON.stringify(messages)
      );
    }
  } catch (error) {
    console.error('[Cloud Sync] Error syncing conversation:', error);
    // Fallback to localStorage on error
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `moonscribe-project-${projectId}-conversations`,
        JSON.stringify(messages)
      );
    }
  }
}

/**
 * Load conversation from Supabase (or localStorage fallback)
 */
export async function loadConversation(
  projectId: string,
  user: User | null,
  accessToken?: string,
  supabaseClient?: SupabaseClient
): Promise<Message[]> {
  if (!user || !accessToken || !(await shouldUseCloudSync(user, supabaseClient))) {
    // Free user - load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`moonscribe-project-${projectId}-conversations`);
      if (saved) {
        const messages = JSON.parse(saved);
        return messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
    }
    return [];
  }
  
  try {
    // Use provided client or create authenticated client
    const supabase = supabaseClient || createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    
    const { data, error } = await supabase
      .from('conversations_sync')
      .select('messages')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    
    if (!data || !data.messages || data.messages.length === 0) {
      // No cloud data - try localStorage as fallback
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`moonscribe-project-${projectId}-conversations`);
        if (saved) {
          const messages = JSON.parse(saved);
          return messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        }
      }
      return [];
    }
    
    // Convert to Message format
    const messages: Message[] = data.messages.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    
    // Also cache in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `moonscribe-project-${projectId}-conversations`,
        JSON.stringify(messages)
      );
    }
    
    return messages;
  } catch (error) {
    console.error('[Cloud Sync] Error loading conversation:', error);
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`moonscribe-project-${projectId}-conversations`);
      if (saved) {
        const messages = JSON.parse(saved);
        return messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
    }
    return [];
  }
}
