'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function SignInPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle, signInWithGithub, user, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/app');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push('/app');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  };

  const handleGithubSignIn = async () => {
    setError(null);
    const { error } = await signInWithGithub();
    if (error) setError(error.message);
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoSection}>
          <div style={styles.logo}>🌙</div>
          <h1 style={styles.title}>Welcome back</h1>
          <p style={styles.subtitle}>Sign in to continue to MoonScribe</p>
        </div>

        {/* OAuth Buttons */}
        <div style={styles.oauthSection}>
          <button onClick={handleGoogleSignIn} style={styles.oauthButton}>
            <svg style={styles.oauthIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          <button onClick={handleGithubSignIn} style={styles.oauthButton}>
            <svg style={styles.oauthIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine}></span>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Password</label>
              <Link href="/auth/forgot-password" style={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={isLoading} style={styles.submitButton}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.footerText}>Don&apos;t have an account?</span>
          <Link href="/auth/signup" style={styles.footerLink}>
            Sign up
          </Link>
        </div>

        {/* Guest Option */}
        <div style={styles.guestSection}>
          <Link href="/app" style={styles.guestLink}>
            Continue as Guest →
          </Link>
          <p style={styles.guestNote}>Limited features, no cloud sync</p>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #0f0f23 100%)',
    padding: '2rem',
  },
  loadingSpinner: {
    color: '#94a3b8',
    fontSize: '1rem',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(15, 15, 35, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '16px',
    padding: '2.5rem',
    backdropFilter: 'blur(20px)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logo: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: '#94a3b8',
    marginTop: '0.5rem',
  },
  oauthSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  oauthButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  oauthIcon: {
    width: '20px',
    height: '20px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '1.5rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  error: {
    padding: '0.75rem 1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#f87171',
    fontSize: '0.875rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#c4b5fd',
  },
  forgotLink: {
    fontSize: '0.8125rem',
    color: '#8b5cf6',
    textDecoration: 'none',
  },
  input: {
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '0.9375rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitButton: {
    padding: '0.875rem 1rem',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'opacity 0.2s',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '1.5rem',
  },
  footerText: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  footerLink: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#8b5cf6',
    textDecoration: 'none',
  },
  guestSection: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'center',
  },
  guestLink: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    textDecoration: 'none',
  },
  guestNote: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
};
