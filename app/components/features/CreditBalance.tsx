'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getBalance, claimFreeStarterCredits } from '@/lib/supabase/credits';

interface CreditBalanceProps {
  onBuyCredits?: () => void;
  showBuyButton?: boolean;
  compact?: boolean;
}

// Check if user has an active BYOK key
function hasActiveBYOKKey(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Check both possible storage keys (anonymous and user-specific)
    const anonKeys = localStorage.getItem('moonscribe-keys-anonymous');
    if (anonKeys) {
      const keys = JSON.parse(anonKeys);
      if (keys.some((k: { provider: string; isActive: boolean }) => 
        k.provider === 'openai' && k.isActive
      )) {
        return true;
      }
    }
    
    // Also check for any user-specific keys (moonscribe-keys-*)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('moonscribe-keys-') && key !== 'moonscribe-keys-anonymous') {
        const userKeys = localStorage.getItem(key);
        if (userKeys) {
          const keys = JSON.parse(userKeys);
          if (keys.some((k: { provider: string; isActive: boolean }) => 
            k.provider === 'openai' && k.isActive
          )) {
            return true;
          }
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return false;
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
  const [hasByok, setHasByok] = useState(false);

  useEffect(() => {
    // Check for BYOK on mount and when storage changes
    const checkByok = () => setHasByok(hasActiveBYOKKey());
    checkByok();
    
    // Listen for storage changes (when user adds/removes API key)
    window.addEventListener('storage', checkByok);
    
    // Also listen for custom events (for same-tab updates)
    const handleApiKeyChange = () => checkByok();
    window.addEventListener('moonscribe-apikey-changed', handleApiKeyChange);
    
    return () => {
      window.removeEventListener('storage', checkByok);
      window.removeEventListener('moonscribe-apikey-changed', handleApiKeyChange);
    };
  }, []);

  useEffect(() => {
    if (user && !hasByok) {
      loadBalance();
    } else {
      setBalance(null);
      setLoading(false);
    }
  }, [user, hasByok]);

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

  // BYOK Mode - user has their own API key
  if (hasByok) {
    if (compact) {
      return (
        <div 
          style={styles.byokContainer}
          title="Using your own API key - no credits needed"
        >
          <span style={styles.byokIcon}>🔑</span>
          <span style={styles.byokText}>BYOK</span>
        </div>
      );
    }
    return (
      <div style={styles.byokContainer}>
        <span style={styles.byokIcon}>🔑</span>
        <span style={styles.byokLabel}>Your API Key</span>
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
        title={`${balance} credits remaining - Click to buy more`}
      >
        <span style={styles.icon}>⚡</span>
        <span style={styles.compactBalance}>{balance}</span>
        <span style={styles.compactLabel}>left</span>
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
  compactLabel: {
    fontSize: '0.6875rem',
    color: '#94a3b8',
    marginLeft: '-0.125rem',
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
  byokContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.625rem',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
  },
  byokIcon: {
    fontSize: '0.75rem',
  },
  byokText: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#34d399',
    letterSpacing: '0.5px',
  },
  byokLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#34d399',
  },
};
