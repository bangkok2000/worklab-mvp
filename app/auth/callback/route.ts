import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    try {
      const supabase = createServerClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error('Error exchanging code for session:', error);
      // Redirect to signin with error
      return NextResponse.redirect(new URL('/auth/signin?error=auth_failed', req.url));
    }
  }

  // Redirect to app after successful auth
  return NextResponse.redirect(new URL('/app', req.url));
}
