import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

/**
 * POST /api/teams/join - Join a team using team code
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { teamCode } = body;
    
    if (!teamCode || teamCode.trim().length === 0) {
      return NextResponse.json({ error: 'Team code is required' }, { status: 400 });
    }
    
    // Clean up the code (uppercase, trim)
    const cleanCode = teamCode.trim().toUpperCase();
    
    // Check if user already owns a team
    const { data: ownedTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (ownedTeam) {
      return NextResponse.json({ error: 'You own a team. Delete your team first to join another.' }, { status: 400 });
    }
    
    // Check if user is already in a team
    const { data: existingMembership } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (existingMembership) {
      return NextResponse.json({ error: 'You are already in a team. Leave that team first.' }, { status: 400 });
    }
    
    // Find the team by code
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, owner_id')
      .eq('team_code', cleanCode)
      .single();
    
    if (teamError || !team) {
      return NextResponse.json({ error: 'Invalid team code. Please check and try again.' }, { status: 404 });
    }
    
    // Don't let owner join their own team as member
    if (team.owner_id === user.id) {
      return NextResponse.json({ error: 'You are already the owner of this team.' }, { status: 400 });
    }
    
    // Add user as member
    const { error: joinError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'member',
      });
    
    if (joinError) {
      console.error('Error joining team:', joinError);
      return NextResponse.json({ error: 'Failed to join team' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        role: 'member',
      }
    });
    
  } catch (error) {
    console.error('Join team API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
