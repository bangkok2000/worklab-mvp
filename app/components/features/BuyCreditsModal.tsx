'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getCreditPackages } from '@/lib/supabase/credits';
import { createCheckoutSession, isStripeConfigured } from '@/lib/stripe/client';
import type { CreditPackage } from '@/lib/supabase/types';

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BuyCreditsModal({ isOpen, onClose, onSuccess }: BuyCreditsModalProps) {
  const { user, session } = useAuth();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPackages();
    }
  }, [isOpen]);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const pkgs = await getCreditPackages();
      setPackages(pkgs);
    } catch (err) {
      console.error('Failed to load packages:', err);
      // Use default packages if DB fails
      setPackages([
        { id: '1', name: 'Basic', credits: 500, price_cents: 500, badge: null, currency: 'usd', stripe_price_id: null, description: 'Perfect for light users', sort_order: 1, is_active: true, created_at: '', updated_at: '' },
        { id: '2', name: 'Standard', credits: 1500, price_cents: 1200, badge: 'Most Popular', currency: 'usd', stripe_price_id: null, description: 'Great for regular research', sort_order: 2, is_active: true, created_at: '', updated_at: '' },
        { id: '3', name: 'Pro', credits: 5000, price_cents: 3500, badge: 'Best Value', currency: 'usd', stripe_price_id: null, description: 'For heavy users', sort_order: 3, is_active: true, created_at: '', updated_at: '' },
      ]);
    }
    setLoading(false);
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!user || !session) {
      setError('Please sign in to purchase credits');
      return;
    }

    if (!isStripeConfigured()) {
      setError('Payments are not yet configured. Please try again later.');
      return;
    }

    setPurchasing(pkg.id);
    setError(null);

    const result = await createCheckoutSession({
      packageId: pkg.id,
      priceId: pkg.stripe_price_id || undefined,
      credits: pkg.credits,
      priceCents: pkg.price_cents,
      accessToken: session.access_token,
    });

    if (!result.success) {
      setError(result.error || 'Failed to start checkout');
      setPurchasing(null);
    }
    // If successful, user is redirected to Stripe
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />
      
      {/* Modal */}
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>⚡ Buy Credits</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {!user && (
            <div style={styles.signInPrompt}>
              <p>Please sign in to purchase credits.</p>
              <button 
                onClick={() => window.location.href = '/auth/signin'}
                style={styles.signInButton}
              >
                Sign In
              </button>
            </div>
          )}

          {user && loading && (
            <div style={styles.loading}>Loading packages...</div>
          )}

          {user && !loading && (
            <>
              {error && <div style={styles.error}>{error}</div>}
              
              <div style={styles.packages}>
                {packages.map(pkg => (
                  <div 
                    key={pkg.id} 
                    style={{
                      ...styles.package,
                      ...(pkg.badge === 'Most Popular' ? styles.popularPackage : {}),
                    }}
                  >
                    {pkg.badge && (
                      <div style={styles.badge}>{pkg.badge}</div>
                    )}
                    <h3 style={styles.packageName}>{pkg.name}</h3>
                    <div style={styles.credits}>
                      <span style={styles.creditAmount}>{pkg.credits.toLocaleString()}</span>
                      <span style={styles.creditLabel}>credits</span>
                    </div>
                    <div style={styles.price}>
                      ${(pkg.price_cents / 100).toFixed(2)}
                    </div>
                    <div style={styles.perCredit}>
                      ${(pkg.price_cents / 100 / pkg.credits).toFixed(4)}/credit
                    </div>
                    {pkg.description && (
                      <p style={styles.description}>{pkg.description}</p>
                    )}
                    <button
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchasing !== null}
                      style={{
                        ...styles.purchaseButton,
                        ...(purchasing === pkg.id ? styles.purchasingButton : {}),
                      }}
                    >
                      {purchasing === pkg.id ? 'Processing...' : 'Buy Now'}
                    </button>
                  </div>
                ))}
              </div>

              {/* BYOK Option */}
              <div style={styles.byokSection}>
                <p style={styles.byokText}>
                  🔑 Power users: Use your own API keys for unlimited usage
                </p>
                <button
                  onClick={() => {
                    onClose();
                    window.location.href = '/app/settings';
                  }}
                  style={styles.byokButton}
                >
                  Set Up BYOK →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    background: 'rgba(15, 15, 35, 0.95)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '16px',
    overflow: 'hidden',
    zIndex: 101,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  closeButton: {
    width: '32px',
    height: '32px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: '1.5rem',
    overflowY: 'auto',
    maxHeight: 'calc(90vh - 80px)',
  },
  signInPrompt: {
    textAlign: 'center',
    padding: '2rem',
    color: '#94a3b8',
  },
  signInButton: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    color: '#94a3b8',
  },
  error: {
    padding: '0.75rem 1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#f87171',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  packages: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  package: {
    position: 'relative',
    padding: '1.5rem',
    background: 'rgba(139, 92, 246, 0.05)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '12px',
    textAlign: 'center',
  },
  popularPackage: {
    border: '2px solid rgba(139, 92, 246, 0.5)',
    background: 'rgba(139, 92, 246, 0.1)',
  },
  badge: {
    position: 'absolute',
    top: '-10px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '0.25rem 0.75rem',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    borderRadius: '20px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'white',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  packageName: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 0.75rem',
  },
  credits: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '0.375rem',
    marginBottom: '0.5rem',
  },
  creditAmount: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#c4b5fd',
  },
  creditLabel: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  price: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  perCredit: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
  description: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    margin: '0.75rem 0',
  },
  purchaseButton: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '1rem',
  },
  purchasingButton: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  byokSection: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '12px',
    textAlign: 'center',
  },
  byokText: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    margin: 0,
  },
  byokButton: {
    marginTop: '0.75rem',
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    color: '#34d399',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
