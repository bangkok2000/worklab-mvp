import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

/**
 * GET /api/teams/members - Get team members
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First check if user owns a team
    const { data: ownedTeam } = await supabase
      .from('teams')
      .select('id, name, owner_id')
      .eq('owner_id', user.id)
      .single();
    
    let teamId = ownedTeam?.id;
    
    // If not owner, check membership
    if (!teamId) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();
      
      teamId = membership?.team_id;
    }
    
    if (!teamId) {
      return NextResponse.json({ error: 'You are not in a team' }, { status: 404 });
    }
    
    // Get team details
    const { data: team } = await supabase
      .from('teams')
      .select('id, name, owner_id')
      .eq('id', teamId)
      .single();
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    // Get owner info
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', team.owner_id)
      .single();
    
    // Get all members
    const { data: memberships, error: membersError } = await supabase
      .from('team_members')
      .select('user_id, role, joined_at')
      .eq('team_id', teamId);
    
    if (membersError) {
      console.error('Error getting members:', membersError);
      return NextResponse.json({ error: 'Failed to get members' }, { status: 500 });
    }
    
    // Get member profiles
    const memberIds = memberships?.map(m => m.user_id) || [];
    const { data: memberProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', memberIds);
    
    // Build members list
    const members = [
      // Owner first
      {
        id: team.owner_id,
        email: ownerProfile?.email || 'Owner',
        name: ownerProfile?.full_name || null,
        role: 'owner',
        joined_at: null,
      },
      // Then members
      ...(memberships || []).map(m => {
        const profile = memberProfiles?.find(p => p.id === m.user_id);
        return {
          id: m.user_id,
          email: profile?.email || 'Member',
          name: profile?.full_name || null,
          role: m.role,
          joined_at: m.joined_at,
        };
      }),
    ];
    
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
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Check if removing self (leaving team)
    if (targetUserId === user.id) {
      // User is leaving the team
      const { error: leaveError } = await supabase
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
    const { data: ownedTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (!ownedTeam) {
      return NextResponse.json({ error: 'Only team owners can remove members' }, { status: 403 });
    }
    
    // Remove the member
    const { error: removeError } = await supabase
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
