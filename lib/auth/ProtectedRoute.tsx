'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Wrapper component that protects routes from unauthenticated access.
 * Use this in pages that require authentication.
 * 
 * Usage:
 * ```tsx
 * export default function ProtectedPage() {
 *   return (
 *     <ProtectedRoute>
 *       <YourPageContent />
 *     </ProtectedRoute>
 *   );
 * }
 * ```
 */
export default function ProtectedRoute({ 
  children, 
  fallback,
  redirectTo = '/auth/signin' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  // Show loading state
  if (loading) {
    return fallback || <LoadingScreen />;
  }

  // Not authenticated - will redirect
  if (!user) {
    return fallback || <LoadingScreen />;
  }

  // Authenticated - render children
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #0f0f23 100%)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          animation: 'pulse 2s infinite',
        }}>
          🌙
        </div>
        <div style={{
          fontSize: '0.875rem',
          color: '#94a3b8',
        }}>
          Loading...
        </div>
      </div>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
