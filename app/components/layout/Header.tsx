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
        height: '64px',
        padding: '0 1.5rem',
        background: 'rgba(15, 15, 35, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
          }}
        >
          🌙
        </div>
        <div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            MoonScribe
          </h1>
          <p style={{ fontSize: '0.6875rem', color: '#8b5cf6', fontWeight: 500, margin: 0 }}>
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
