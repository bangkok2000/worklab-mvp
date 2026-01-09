import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { encryptApiKey, generateTeamCode, validateApiKeyFormat } from '@/lib/utils/server-encryption';

/**
 * GET /api/teams - Get current user's team
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's team using the function
    const { data: team, error: teamError } = await supabase
      .rpc('get_user_team');
    
    if (teamError) {
      console.error('Error getting team:', teamError);
      return NextResponse.json({ error: 'Failed to get team' }, { status: 500 });
    }
    
    return NextResponse.json({ team });
    
  } catch (error) {
    console.error('Teams API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/teams - Create a new team
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
    const { name, apiKey, apiProvider = 'openai' } = body;
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }
    
    // Check if user already owns a team
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (existingTeam) {
      return NextResponse.json({ error: 'You already own a team' }, { status: 400 });
    }
    
    // Check if user is already in a team
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (membership) {
      return NextResponse.json({ error: 'You are already a member of another team. Leave that team first.' }, { status: 400 });
    }
    
    // Generate unique team code
    let teamCode = generateTeamCode();
    let attempts = 0;
    
    // Ensure code is unique
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('teams')
        .select('id')
        .eq('team_code', teamCode)
        .single();
      
      if (!existing) break;
      teamCode = generateTeamCode();
      attempts++;
    }
    
    // Encrypt API key if provided
    let encryptedKey = null;
    if (apiKey) {
      if (!validateApiKeyFormat(apiKey, apiProvider)) {
        return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 });
      }
      encryptedKey = encryptApiKey(apiKey);
    }
    
    // Create the team
    const { data: newTeam, error: createError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        owner_id: user.id,
        team_code: teamCode,
        api_key_encrypted: encryptedKey,
        api_provider: apiProvider,
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating team:', createError);
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      team: {
        id: newTeam.id,
        name: newTeam.name,
        team_code: newTeam.team_code,
        has_api_key: !!encryptedKey,
        api_provider: newTeam.api_provider,
        role: 'owner',
        member_count: 1,
      }
    });
    
  } catch (error) {
    console.error('Teams API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
