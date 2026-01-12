/**
 * Team-related Supabase utilities
 */

import { createServerClient } from '@/lib/supabase/client';
import { decryptApiKey } from '@/lib/utils/server-encryption';

export interface TeamApiKeyResult {
  hasKey: boolean;
  apiKey: string | null;
  provider: string;
  teamName: string | null;
  error?: string;
}

/**
 * Get the API key for a user (from their team if they're in one)
 * This is used by API routes to get the key for AI calls
 */
export async function getTeamApiKey(userId: string): Promise<TeamApiKeyResult> {
  try {
    const supabase = createServerClient();
    
    // First check if user owns a team
    const { data: ownedTeam } = await supabase
      .from('teams')
      .select('id, name, api_key_encrypted, api_provider')
      .eq('owner_id', userId)
      .single();
    
    if (ownedTeam) {
      if (!ownedTeam.api_key_encrypted) {
        return {
          hasKey: false,
          apiKey: null,
          provider: ownedTeam.api_provider || 'openai',
          teamName: ownedTeam.name,
          error: 'Team has no API key configured',
        };
      }
      
      try {
        const decryptedKey = decryptApiKey(ownedTeam.api_key_encrypted);
        return {
          hasKey: true,
          apiKey: decryptedKey,
          provider: ownedTeam.api_provider || 'openai',
          teamName: ownedTeam.name,
        };
      } catch (decryptError) {
        console.error('Failed to decrypt team API key:', decryptError);
        return {
          hasKey: false,
          apiKey: null,
          provider: ownedTeam.api_provider || 'openai',
          teamName: ownedTeam.name,
          error: 'Failed to decrypt API key',
        };
      }
    }
    
    // Check if user is a member of a team
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .single();
    
    if (!membership) {
      return {
        hasKey: false,
        apiKey: null,
        provider: 'openai',
        teamName: null,
      };
    }
    
    // Get the team's API key
    const { data: team } = await supabase
      .from('teams')
      .select('id, name, api_key_encrypted, api_provider')
      .eq('id', membership.team_id)
      .single();
    
    if (!team) {
      return {
        hasKey: false,
        apiKey: null,
        provider: 'openai',
        teamName: null,
        error: 'Team not found',
      };
    }
    
    if (!team.api_key_encrypted) {
      return {
        hasKey: false,
        apiKey: null,
        provider: team.api_provider || 'openai',
        teamName: team.name,
        error: 'Team has no API key configured',
      };
    }
    
    try {
      const decryptedKey = decryptApiKey(team.api_key_encrypted);
      return {
        hasKey: true,
        apiKey: decryptedKey,
        provider: team.api_provider || 'openai',
        teamName: team.name,
      };
    } catch (decryptError) {
      console.error('Failed to decrypt team API key:', decryptError);
      return {
        hasKey: false,
        apiKey: null,
        provider: team.api_provider || 'openai',
        teamName: team.name,
        error: 'Failed to decrypt API key',
      };
    }
    
  } catch (error) {
    console.error('Error getting team API key:', error);
    return {
      hasKey: false,
      apiKey: null,
      provider: 'openai',
      teamName: null,
      error: 'Internal error',
    };
  }
}

/**
 * Get team leader's user ID (for pooled credits)
 * Returns the owner_id if user is in a team, null otherwise
 * @param userId The user ID to check
 * @param supabaseClient Optional authenticated Supabase client (for RLS)
 */
export async function getTeamLeaderId(userId: string, supabaseClient?: any): Promise<string | null> {
  try {
    const supabase = supabaseClient || createServerClient();
    
    // First check if user owns a team (they are the leader)
    const { data: ownedTeam } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('owner_id', userId)
      .maybeSingle();
    
    if (ownedTeam) {
      return ownedTeam.owner_id; // User is the leader
    }
    
    // Check if user is a member of a team
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!membership) {
      return null; // Not in a team
    }
    
    // Get the team's owner_id
    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', membership.team_id)
      .maybeSingle();
    
    return team?.owner_id || null;
  } catch (error) {
    console.error('Error getting team leader ID:', error);
    return null;
  }
}

/**
 * Check if a user has access to AI features (either via team API key or credits)
 */
export async function checkUserAiAccess(userId: string): Promise<{
  hasAccess: boolean;
  source: 'team' | 'credits' | 'byok' | 'none';
  teamName?: string;
}> {
  // First check for team API key
  const teamResult = await getTeamApiKey(userId);
  
  if (teamResult.hasKey && teamResult.apiKey) {
    return {
      hasAccess: true,
      source: 'team',
      teamName: teamResult.teamName || undefined,
    };
  }
  
  // If in a team but no key, they can still use credits
  if (teamResult.teamName) {
    return {
      hasAccess: true,
      source: 'credits',
      teamName: teamResult.teamName,
    };
  }
  
  // Not in a team - individual user
  // They can use BYOK or credits
  return {
    hasAccess: true,
    source: 'credits', // Default to credits for non-team users
  };
}
