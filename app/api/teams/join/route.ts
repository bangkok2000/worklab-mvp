import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

/**
 * POST /api/teams/join - Join a team using team code
 */
export async function POST(request: NextRequest) {
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
    const { createClient } = await import('@supabase/supabase-js');
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
    
    const body = await request.json();
    const { teamCode } = body;
    
    if (!teamCode || teamCode.trim().length === 0) {
      return NextResponse.json({ error: 'Team code is required' }, { status: 400 });
    }
    
    // Clean up the code (uppercase, trim)
    const cleanCode = teamCode.trim().toUpperCase();
    
    // Check if user already owns a team
    const { data: ownedTeam } = await authenticatedSupabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    
    if (ownedTeam) {
      return NextResponse.json({ error: 'You own a team. Delete your team first to join another.' }, { status: 400 });
    }
    
    // Check if user is already in a team
    const { data: existingMembership } = await authenticatedSupabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (existingMembership) {
      return NextResponse.json({ error: 'You are already in a team. Leave that team first.' }, { status: 400 });
    }
    
    // Find the team by code using RPC function (bypasses RLS for joining)
    console.log('[Join Team] Looking up team with code:', cleanCode);
    const { data: teamResult, error: teamError } = await authenticatedSupabase
      .rpc('lookup_team_by_code', { p_team_code: cleanCode });
    
    console.log('[Join Team] RPC result:', { teamResult, teamError });
    
    if (teamError) {
      console.error('[Join Team] Error finding team:', JSON.stringify(teamError, null, 2));
      return NextResponse.json({ 
        error: 'Failed to find team',
        details: teamError.message,
        code: teamError.code,
        hint: teamError.hint
      }, { status: 500 });
    }
    
    if (!teamResult || teamResult.length === 0) {
      console.log('[Join Team] No team found with code:', cleanCode);
      return NextResponse.json({ error: 'Invalid team code. Please check and try again.' }, { status: 404 });
    }
    
    const team = teamResult[0];
    console.log('[Join Team] Found team:', team);
    
    // Don't let owner join their own team as member
    if (team.owner_id === user.id) {
      return NextResponse.json({ error: 'You are already the owner of this team.' }, { status: 400 });
    }
    
    // Add user as member
    console.log('[Join Team] Adding user to team:', { team_id: team.id, user_id: user.id });
    const { error: joinError } = await authenticatedSupabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'member',
      });
    
    if (joinError) {
      console.error('[Join Team] Error adding member:', JSON.stringify(joinError, null, 2));
      return NextResponse.json({ 
        error: 'Failed to join team',
        details: joinError.message,
        code: joinError.code,
        hint: joinError.hint
      }, { status: 500 });
    }
    
    console.log('[Join Team] Successfully joined team!');
    
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
