import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    // During build, return null - actual usage will fail at runtime with a clear error
    return null;
  }
  
  return { supabaseUrl, supabaseAnonKey };
};

// Client-side Supabase client (lazy initialized)
export const getSupabase = (): SupabaseClient => {
  if (_supabase) return _supabase;
  
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  _supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  
  return _supabase;
};

// Legacy export for backward compatibility (lazy)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop];
  },
});

// Server-side Supabase client (for API routes)
export const createServerClient = (): SupabaseClient => {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(config.supabaseUrl, config.supabaseAnonKey);
};

// Admin client (for service role operations)
export const createAdminClient = (): SupabaseClient => {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Missing Supabase environment variables');
  }
  
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_KEY');
  }
  
  return createClient(config.supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
