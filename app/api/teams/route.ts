import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { encryptApiKey, generateTeamCode, validateApiKeyFormat } from '@/lib/utils/server-encryption';

/**
 * GET /api/teams - Get current user's team
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
    
    // Get user's team using the function (needs authenticated client for RLS)
    const { data: team, error: teamError } = await authenticatedSupabase
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
    const { name, apiKey, apiProvider = 'openai' } = body;
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }
    
    // Try to create team directly - if user already has one, we'll get a constraint error
    // This avoids RLS issues with checking empty tables
    
    // Generate unique team code
    // NOTE: We skip checking for duplicate codes due to RLS - if duplicate, INSERT will fail with constraint error
    let teamCode = generateTeamCode();
    
    // Encrypt API key if provided
    let encryptedKey = null;
    if (apiKey) {
      if (!validateApiKeyFormat(apiKey, apiProvider)) {
        return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 });
      }
      encryptedKey = encryptApiKey(apiKey);
    }
    
    // Create the team
    console.log('[Team Create] Attempting to create team:', { name: name.trim(), owner_id: user.id, team_code: teamCode });
    
    const { data: newTeam, error: createError } = await authenticatedSupabase
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
      console.error('[Team Create] Full error object:', JSON.stringify(createError, null, 2));
      console.error('[Team Create] Error code:', createError.code);
      console.error('[Team Create] Error message:', createError.message);
      console.error('[Team Create] Error details:', createError.details);
      console.error('[Team Create] Error hint:', createError.hint);
      
      // Check if user already owns a team (unique constraint on owner_id or similar)
      if (createError.code === '23505' || createError.message?.includes('already') || createError.message?.includes('duplicate')) {
        return NextResponse.json({ error: 'You already own a team' }, { status: 400 });
      }
      
      // Check RLS/permission errors
      if (createError.code === '42501' || createError.message?.includes('permission') || createError.message?.includes('policy')) {
        return NextResponse.json({ 
          error: 'Permission denied. Check RLS policies.',
          details: createError.message,
          hint: createError.hint || 'Make sure the teams table has INSERT policy allowing owner_id = auth.uid()'
        }, { status: 403 });
      }
      
      // Return full error details for debugging
      return NextResponse.json({ 
        error: 'Failed to create team',
        details: createError.message,
        code: createError.code,
        hint: createError.hint,
        fullError: process.env.NODE_ENV === 'development' ? createError : undefined
      }, { status: 500 });
    }
    
    console.log('[Team Create] Success! Team created:', newTeam.id);
    
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
