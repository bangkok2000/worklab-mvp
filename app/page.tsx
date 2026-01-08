'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // For now, redirect to the app directly
    // Later this will be a proper landing/marketing page
    router.push('/app');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f23 50%, #1a1a2e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#f1f5f9',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 1.5rem',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          boxShadow: '0 0 50px rgba(139, 92, 246, 0.5)',
          animation: 'pulse 2s infinite',
        }}>
          🌙
        </div>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.5rem',
        }}>
          MoonScribe
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Loading your workspace...</p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.4);
          }
          50% {
            box-shadow: 0 0 60px rgba(139, 92, 246, 0.7);
          }
        }
      `}</style>
    </div>
  );
}
