import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getBalance } from '@/lib/supabase/credits';
import { getTeamLeaderId } from '@/lib/supabase/teams';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/credits/balance - Get user's credit balance (handles team pooled credits)
 * Returns leader's balance if user is a team member, otherwise user's own balance
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    
    // Extract token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Invalid or expired session.' }, { status: 401 });
    }
    
    // Create authenticated client for RLS
    const authenticatedSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
    
    // Check if user is in a team (to use pooled credits)
    // Use service key to bypass RLS for team lookups
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    const leaderId = await getTeamLeaderId(user.id, serviceSupabase);
    
    console.log('[Credits Balance API] User:', user.id, 'Leader ID:', leaderId);
    
    if (leaderId && leaderId !== user.id) {
      // User is a team member (not the leader) - return leader's balance
      const leaderBalance = await getBalance(leaderId, authenticatedSupabase);
      
      // Get team info using service key
      const { data: membership } = await serviceSupabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      let teamName = null;
      if (membership) {
        const { data: team } = await serviceSupabase
          .from('teams')
          .select('name, api_key_encrypted')
          .eq('id', membership.team_id)
          .maybeSingle();
        
        if (team) {
          teamName = team.name;
          // If team has API key, no credits needed
          if (team.api_key_encrypted) {
            return NextResponse.json({ 
              balance: null, 
              isTeamMember: true,
              teamName,
              hasTeamApiKey: true,
            });
          }
        }
      }
      
      console.log('[Credits Balance API] Returning leader balance:', leaderBalance, 'for team member');
      return NextResponse.json({ 
        balance: leaderBalance, 
        isTeamMember: true,
        teamName,
        hasTeamApiKey: false,
      });
    }
    
    // User is not in a team or is the leader - return their own balance
    const balance = await getBalance(user.id, authenticatedSupabase);
    return NextResponse.json({ 
      balance, 
      isTeamMember: false,
      teamName: null,
      hasTeamApiKey: false,
    });
    
  } catch (error) {
    console.error('Get balance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
