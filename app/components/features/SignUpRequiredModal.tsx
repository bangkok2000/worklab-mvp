'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface SignUpRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  queriesUsed: number;
  queryLimit: number;
}

export function SignUpRequiredModal({ 
  isOpen, 
  onClose, 
  queriesUsed,
  queryLimit 
}: SignUpRequiredModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleSignUp = () => {
    router.push('/auth/signup');
  };

  const handleSignIn = () => {
    router.push('/auth/signin');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header with gradient */}
        <div style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
          textAlign: 'center',
        }}>
          {/* Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '2.5rem',
          }}>
            🎉
          </div>
          
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 700, 
            margin: '0 0 0.5rem 0',
            color: '#f1f5f9',
          }}>
            You&apos;re Loving MoonScribe!
          </h2>
          
          <p style={{
            color: '#94a3b8',
            fontSize: '0.9375rem',
            margin: 0,
          }}>
            You&apos;ve used all {queryLimit} free queries
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem 2rem' }}>
          {/* Usage indicator */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}>
              <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Free queries used</span>
              <span style={{ color: '#f87171', fontSize: '0.875rem', fontWeight: 600 }}>
                {queriesUsed}/{queryLimit}
              </span>
            </div>
            <div style={{
              height: '6px',
              background: 'rgba(139, 92, 246, 0.2)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)',
                borderRadius: '3px',
              }} />
            </div>
          </div>

          {/* Benefits */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ 
              color: '#e2e8f0', 
              fontSize: '0.9375rem', 
              marginBottom: '1rem',
              fontWeight: 500,
            }}>
              Create a free account to:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { icon: '🎁', text: 'Get 100 FREE credits to start' },
                { icon: '💾', text: 'Sync your data across devices' },
                { icon: '🚀', text: 'Unlimited queries with credits' },
                { icon: '🔑', text: 'Or use your own API keys (BYOK)' },
              ].map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}>
                  <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                  <span style={{ color: '#c4b5fd', fontSize: '0.9375rem' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={handleSignUp}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              ✨ Create Free Account
            </button>
            
            <button
              onClick={handleSignIn}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '10px',
                color: '#c4b5fd',
                fontSize: '0.9375rem',
                cursor: 'pointer',
              }}
            >
              Already have an account? Sign In
            </button>
          </div>

          {/* BYOK option */}
          <div style={{
            marginTop: '1.25rem',
            padding: '1rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '10px',
            textAlign: 'center',
          }}>
            <p style={{ 
              color: '#34d399', 
              fontSize: '0.8125rem', 
              margin: 0,
            }}>
              🔑 Already have an OpenAI API key? Sign in and use BYOK mode for unlimited queries!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 2rem',
          borderTop: '1px solid rgba(139, 92, 246, 0.15)',
          textAlign: 'center',
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
