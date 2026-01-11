'use client';

import React from 'react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface HeaderProps {
  onSettingsClick?: () => void;
  onNewChat?: () => void;
  status?: string;
}

export default function Header({ onSettingsClick, onNewChat, status }: HeaderProps) {
  return (
    <header
      style={{
        height: '56px', // Reduced from 64px
        padding: '0 1.25rem', // Reduced from 1.5rem
        background: 'rgba(15, 15, 35, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(124, 58, 237, 0.2)', // More muted
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}> {/* Reduced gap */}
        <div
          style={{
            width: '32px', // Reduced from 38px
            height: '32px',
            borderRadius: '8px', // Reduced from 10px
            background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', // More muted
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.125rem', // Reduced from 1.25rem
            boxShadow: '0 0 16px rgba(124, 58, 237, 0.3)', // Softer shadow
          }}
        >
          🌙
        </div>
        <div>
          <h1
            style={{
              fontSize: '1.125rem', // Reduced from 1.25rem
              fontWeight: 700,
              background: 'linear-gradient(135deg, #fff 0%, #a78bfa 100%)', // Softer gradient
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            MoonScribe
          </h1>
          <p style={{ fontSize: '0.625rem', color: '#7c3aed', fontWeight: 500, margin: 0 }}> {/* Reduced size, muted color */}
            Document Intelligence
          </p>
        </div>
      </div>

      {/* Center - Quick actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {status && (
          <Badge variant={status.includes('Error') ? 'error' : 'success'} dot>
            {status}
          </Badge>
        )}
      </div>

      {/* Right - Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {onNewChat && (
          <Button variant="secondary" size="sm" onClick={onNewChat}>
            + New Chat
          </Button>
        )}
        {onSettingsClick && (
          <Button variant="ghost" size="sm" onClick={onSettingsClick} leftIcon="⚙️">
            Settings
          </Button>
        )}
      </div>
    </header>
  );
}
