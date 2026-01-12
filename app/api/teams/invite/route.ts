import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/teams/invite - Send team invitation email
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
    
    const body = await request.json();
    const { email, name, role = 'member' } = body;
    
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
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
    
    // Check if user owns a team
    const { data: team, error: teamError } = await authenticatedSupabase
      .from('teams')
      .select('id, name, team_code, owner_id')
      .eq('owner_id', user.id)
      .single();
    
    if (teamError || !team) {
      return NextResponse.json({ error: 'You must be a team owner to send invitations' }, { status: 403 });
    }
    
    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ 
        error: 'Email service not configured. Please set RESEND_API_KEY environment variable.' 
      }, { status: 500 });
    }
    
    // Get app URL for the join link
    let appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      if (process.env.VERCEL_URL) {
        appUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        appUrl = 'http://localhost:3000';
      }
    }
    
    // Create join link with team code pre-filled
    // Navigate to settings page with team tab and pre-filled code
    const joinUrl = `${appUrl}/app/settings?tab=team&teamCode=${team.team_code}&invite=true`;
    
    // Get owner's name/email for the email
    const { data: ownerProfile } = await authenticatedSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    
    const ownerName = ownerProfile?.full_name || ownerProfile?.email || 'Team Owner';
    
    // Send invitation email
    try {
      const { data, error: emailError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'MoonScribe <onboarding@resend.dev>',
        to: email.trim(),
        subject: `You've been invited to join ${team.name} on MoonScribe`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a2e; background-color: #f1f5f9; margin: 0; padding: 0;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 2rem;">
                <div style="text-align: center; margin-bottom: 2rem;">
                  <h1 style="color: #7c3aed; margin: 0; font-size: 1.75rem;">📁 MoonScribe</h1>
                </div>
                
                <h2 style="color: #1a1a2e; margin-top: 0;">You've been invited to join a team!</h2>
                
                <p style="color: #64748b; font-size: 1rem;">
                  <strong>${ownerName}</strong> has invited you to join <strong>${team.name}</strong> on MoonScribe.
                </p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0;">
                  <p style="margin: 0 0 0.5rem 0; color: #64748b; font-size: 0.875rem; font-weight: 600;">Team Code:</p>
                  <p style="margin: 0; font-family: monospace; font-size: 1.5rem; font-weight: 600; color: #7c3aed; letter-spacing: 0.05em;">
                    ${team.team_code}
                  </p>
                </div>
                
                <div style="text-align: center; margin: 2rem 0;">
                  <a href="${joinUrl}" 
                     style="display: inline-block; padding: 0.75rem 2rem; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1rem;">
                    Join Team
                  </a>
                </div>
                
                <p style="color: #64748b; font-size: 0.875rem; margin-top: 2rem;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${joinUrl}" style="color: #7c3aed; word-break: break-all;">${joinUrl}</a>
                </p>
                
                <p style="color: #64748b; font-size: 0.875rem; margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </body>
          </html>
        `,
        text: `
You've been invited to join ${team.name} on MoonScribe!

${ownerName} has invited you to join their team.

Team Code: ${team.team_code}

Join the team by clicking this link:
${joinUrl}

Or manually enter the team code in MoonScribe.

If you didn't expect this invitation, you can safely ignore this email.
        `.trim(),
      });
      
      if (emailError) {
        console.error('Resend email error:', emailError);
        return NextResponse.json({ 
          error: 'Failed to send invitation email',
          details: emailError.message 
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Invitation email sent successfully',
        emailId: data?.id,
      });
      
    } catch (emailError: any) {
      console.error('Error sending email:', emailError);
      return NextResponse.json({ 
        error: 'Failed to send invitation email',
        details: emailError.message 
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Invite API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
