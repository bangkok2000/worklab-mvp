import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Test 1: Check connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (healthError && healthError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine for empty tables
      return NextResponse.json({
        success: false,
        error: 'Supabase connection failed',
        details: healthError.message,
      }, { status: 500 });
    }
    
    // Test 2: Check if tables exist
    const tables = [
      'profiles',
      'collections',
      'documents',
      'conversations',
      'messages',
      'api_keys',
      'usage_logs',
    ];
    
    const tableChecks: Record<string, boolean> = {};
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        // If we get a permission error, table exists but RLS is blocking (expected)
        // If we get a relation error, table doesn't exist
        tableChecks[table] = !error || error.code === 'PGRST301' || error.code === '42501';
      } catch (e) {
        tableChecks[table] = false;
      }
    }
    
    // Test 3: Check RLS policies (optional - RPC function may not exist)
    let rlsCheck = { available: false, error: null };
    try {
      const { error: policyError } = await supabase
        .rpc('check_rls_enabled');
      rlsCheck = { available: !policyError, error: policyError?.message || null };
    } catch (e: any) {
      rlsCheck = { available: false, error: 'RPC function not available' };
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      tests: {
        connection: true,
        tables: tableChecks,
        allTablesExist: Object.values(tableChecks).every(exists => exists),
        rlsCheck,
      },
      environment: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
      },
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

