import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { encryptApiKey, validateApiKeyFormat } from '@/lib/utils/server-encryption';

/**
 * PUT /api/teams/api-key - Update team's API key (owner only)
 */
export async function PUT(request: NextRequest) {
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
    const { apiKey, apiProvider = 'openai' } = body;
    
    // Get user's owned team
    const { data: team, error: teamError } = await authenticatedSupabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (teamError || !team) {
      return NextResponse.json({ error: 'You do not own a team' }, { status: 403 });
    }
    
    // Validate and encrypt the API key
    if (!apiKey || !validateApiKeyFormat(apiKey, apiProvider)) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 });
    }
    
    const encryptedKey = encryptApiKey(apiKey);
    
    // Update the team
    const { error: updateError } = await authenticatedSupabase
      .from('teams')
      .update({
        api_key_encrypted: encryptedKey,
        api_provider: apiProvider,
        updated_at: new Date().toISOString(),
      })
      .eq('id', team.id);
    
    if (updateError) {
      console.error('Error updating API key:', updateError);
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'API key updated successfully',
    });
    
  } catch (error) {
    console.error('API key update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/teams/api-key - Remove team's API key (owner only)
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
    
    // Get user's owned team
    const { data: team, error: teamError } = await authenticatedSupabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (teamError || !team) {
      return NextResponse.json({ error: 'You do not own a team' }, { status: 403 });
    }
    
    // Remove the API key
    const { error: updateError } = await authenticatedSupabase
      .from('teams')
      .update({
        api_key_encrypted: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', team.id);
    
    if (updateError) {
      console.error('Error removing API key:', updateError);
      return NextResponse.json({ error: 'Failed to remove API key' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'API key removed successfully',
    });
    
  } catch (error) {
    console.error('API key delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
