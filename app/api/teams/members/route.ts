import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/teams/members - Get team members
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
    
    // First check if user owns a team
    const { data: ownedTeam } = await authenticatedSupabase
      .from('teams')
      .select('id, name, owner_id')
      .eq('owner_id', user.id)
      .maybeSingle();
    
    let teamId = ownedTeam?.id;
    
    // If not owner, check membership
    if (!teamId) {
      const { data: membership, error: membershipError } = await authenticatedSupabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (membershipError) {
        console.error('[Teams Members API] Error checking membership:', membershipError);
      }
      
      teamId = membership?.team_id;
    }
    
    if (!teamId) {
      return NextResponse.json({ error: 'You are not in a team' }, { status: 404 });
    }
    
    // Use service role client to bypass RLS for team member lookups
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
    
    // Get team details (use service key to bypass RLS)
    const { data: team } = await serviceSupabase
      .from('teams')
      .select('id, name, owner_id')
      .eq('id', teamId)
      .maybeSingle();
    
    if (!team) {
      console.error('[Teams Members API] Team not found for teamId:', teamId);
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    // Get owner info (bypass RLS with service key)
    const { data: ownerProfile } = await serviceSupabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', team.owner_id)
      .maybeSingle();
    
    // Get all members (use service key to bypass RLS)
    const { data: memberships, error: membersError } = await serviceSupabase
      .from('team_members')
      .select('user_id, role, joined_at')
      .eq('team_id', teamId);
    
    if (membersError) {
      console.error('[Teams Members API] Error getting members:', membersError);
      return NextResponse.json({ error: 'Failed to get members' }, { status: 500 });
    }
    
    console.log('[Teams Members API] Found memberships:', memberships?.length || 0, memberships);
    
    // Get member profiles (bypass RLS with service key)
    const memberIds = memberships?.map(m => m.user_id) || [];
    let memberProfiles: any[] = [];
    
    if (memberIds.length > 0) {
      const { data: profiles, error: profilesError } = await serviceSupabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', memberIds);
      
      if (profilesError) {
        console.error('[Teams Members API] Error getting member profiles:', profilesError);
      } else {
        memberProfiles = profiles || [];
        console.log('[Teams Members API] Found member profiles:', memberProfiles.length, memberProfiles.map(p => ({ id: p.id, email: p.email })));
      }
    }
    
    // Build members list
    const members = [
      // Owner first
      {
        id: team.owner_id,
        email: ownerProfile?.email || null,
        name: ownerProfile?.full_name || null,
        role: 'owner',
        joined_at: null,
      },
      // Then members
      ...(memberships || []).map(m => {
        const profile = memberProfiles.find(p => p.id === m.user_id);
        return {
          id: m.user_id,
          email: profile?.email || null,
          name: profile?.full_name || null,
          role: m.role || 'member',
          joined_at: m.joined_at,
        };
      }),
    ];
    
    // Debug: Log the requesting user and returned members
    console.log('[Teams Members API] Requesting user:', {
      id: user.id,
      email: user.email,
    });
    console.log('[Teams Members API] Returning members:', members.map(m => ({
      id: m.id,
      email: m.email,
      name: m.name,
      role: m.role,
    })));
    
    return NextResponse.json({ members });
    
  } catch (error) {
    console.error('Get members API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/teams/members - Remove a member (owner only) or leave team (self)
 */
export async function DELETE(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Check if removing self (leaving team)
    if (targetUserId === user.id) {
      // User is leaving the team
      const { error: leaveError } = await authenticatedSupabase
        .from('team_members')
        .delete()
        .eq('user_id', user.id);
      
      if (leaveError) {
        console.error('Error leaving team:', leaveError);
        return NextResponse.json({ error: 'Failed to leave team' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, message: 'Left the team successfully' });
    }
    
    // Owner removing another member
    const { data: ownedTeam } = await authenticatedSupabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    
    if (!ownedTeam) {
      return NextResponse.json({ error: 'Only team owners can remove members' }, { status: 403 });
    }
    
    // Remove the member
    const { error: removeError } = await authenticatedSupabase
      .from('team_members')
      .delete()
      .eq('team_id', ownedTeam.id)
      .eq('user_id', targetUserId);
    
    if (removeError) {
      console.error('Error removing member:', removeError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Member removed successfully' });
    
  } catch (error) {
    console.error('Delete member API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
