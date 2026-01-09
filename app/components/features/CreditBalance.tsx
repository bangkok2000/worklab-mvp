'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getBalance, claimFreeStarterCredits } from '@/lib/supabase/credits';

interface CreditBalanceProps {
  onBuyCredits?: () => void;
  showBuyButton?: boolean;
  compact?: boolean;
}

export default function CreditBalance({ 
  onBuyCredits, 
  showBuyButton = true,
  compact = false 
}: CreditBalanceProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (user) {
      loadBalance();
    } else {
      setBalance(null);
      setLoading(false);
    }
  }, [user]);

  const loadBalance = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const bal = await getBalance(user.id);
      setBalance(bal);
    } catch (error) {
      console.error('Failed to load balance:', error);
      setBalance(0);
    }
    setLoading(false);
  };

  const handleClaimFree = async () => {
    if (!user) return;
    setClaiming(true);
    try {
      const result = await claimFreeStarterCredits(user.id);
      if (result.success) {
        setBalance(result.credits);
      }
    } catch (error) {
      console.error('Failed to claim credits:', error);
    }
    setClaiming(false);
  };

  // Not logged in - show sign in prompt
  if (!user) {
    if (compact) return null;
    return (
      <div style={styles.container}>
        <span style={styles.guestText}>Guest Mode</span>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.skeleton} />
      </div>
    );
  }

  // Zero balance - offer free credits or buy
  if (balance === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.balanceSection}>
          <span style={styles.icon}>⚡</span>
          <span style={styles.zeroBalance}>0 credits</span>
        </div>
        <button 
          onClick={handleClaimFree}
          disabled={claiming}
          style={styles.claimButton}
        >
          {claiming ? '...' : '🎁 Get 100 Free'}
        </button>
      </div>
    );
  }

  // Low balance warning (< 20 credits)
  const isLow = balance !== null && balance < 20;

  if (compact) {
    return (
      <button 
        onClick={onBuyCredits}
        style={{
          ...styles.compactContainer,
          ...(isLow ? styles.lowBalance : {}),
        }}
        title={`${balance} credits remaining`}
      >
        <span style={styles.icon}>⚡</span>
        <span style={styles.compactBalance}>{balance}</span>
      </button>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.balanceSection,
        ...(isLow ? styles.lowBalance : {}),
      }}>
        <span style={styles.icon}>⚡</span>
        <span style={styles.balance}>{balance?.toLocaleString()}</span>
        <span style={styles.label}>credits</span>
      </div>
      {showBuyButton && (
        <button onClick={onBuyCredits} style={styles.buyButton}>
          + Buy
        </button>
      )}
      {isLow && (
        <span style={styles.lowWarning}>Low</span>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.75rem',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '8px',
  },
  compactContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.625rem',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  balanceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  icon: {
    fontSize: '0.875rem',
  },
  balance: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  compactBalance: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  zeroBalance: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#94a3b8',
  },
  label: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  buyButton: {
    padding: '0.25rem 0.5rem',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  claimButton: {
    padding: '0.25rem 0.625rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  lowBalance: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    background: 'rgba(245, 158, 11, 0.1)',
  },
  lowWarning: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#fbbf24',
    textTransform: 'uppercase',
  },
  guestText: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  skeleton: {
    width: '80px',
    height: '20px',
    background: 'rgba(139, 92, 246, 0.2)',
    borderRadius: '4px',
    animation: 'pulse 2s infinite',
  },
};
