'use client';

import React from 'react';
import { getRemainingGuestQueries, getGuestLimit } from '@/lib/utils/guest-limits';

interface GuestUsageIndicatorProps {
  onSignUpClick?: () => void;
}

export function GuestUsageIndicator({ onSignUpClick }: GuestUsageIndicatorProps) {
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const limit = getGuestLimit();

  React.useEffect(() => {
    setRemaining(getRemainingGuestQueries());
  }, []);

  // Don't render on server or before hydration
  if (remaining === null) return null;

  const isLow = remaining <= 2;
  const isEmpty = remaining === 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 0.875rem',
      background: isEmpty 
        ? 'rgba(239, 68, 68, 0.1)' 
        : isLow 
          ? 'rgba(251, 191, 36, 0.1)' 
          : 'rgba(139, 92, 246, 0.1)',
      border: `1px solid ${
        isEmpty 
          ? 'rgba(239, 68, 68, 0.3)' 
          : isLow 
            ? 'rgba(251, 191, 36, 0.3)' 
            : 'rgba(139, 92, 246, 0.2)'
      }`,
      borderRadius: '10px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
      }}>
        <span style={{ fontSize: '1rem' }}>
          {isEmpty ? '🚫' : isLow ? '⚠️' : '🎁'}
        </span>
        <span style={{
          fontSize: '0.8125rem',
          color: isEmpty ? '#f87171' : isLow ? '#fbbf24' : '#c4b5fd',
          fontWeight: 500,
        }}>
          {isEmpty 
            ? 'No free queries left' 
            : `${remaining}/${limit} free queries`
          }
        </span>
      </div>

      {isEmpty ? (
        <button
          onClick={onSignUpClick}
          style={{
            padding: '0.375rem 0.75rem',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Sign Up Free
        </button>
      ) : (
        <span style={{
          fontSize: '0.6875rem',
          color: '#64748b',
        }}>
          Guest
        </span>
      )}
    </div>
  );
}
