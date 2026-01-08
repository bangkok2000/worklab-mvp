'use client';

import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const sizeMap = {
  sm: { size: '28px', fontSize: '0.75rem' },
  md: { size: '36px', fontSize: '0.875rem' },
  lg: { size: '48px', fontSize: '1.125rem' },
  xl: { size: '64px', fontSize: '1.5rem' },
};

const statusColors = {
  online: '#10b981',
  offline: '#64748b',
  away: '#f59e0b',
  busy: '#ef4444',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({ src, alt, name, size = 'md', status }: AvatarProps) {
  const { size: dimensions, fontSize } = sizeMap[size];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          style={{
            width: dimensions,
            height: dimensions,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgba(139, 92, 246, 0.3)',
          }}
        />
      ) : (
        <div
          style={{
            width: dimensions,
            height: dimensions,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize,
            fontWeight: 600,
            color: '#ffffff',
          }}
        >
          {name ? getInitials(name) : '?'}
        </div>
      )}
      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size === 'sm' ? '8px' : '12px',
            height: size === 'sm' ? '8px' : '12px',
            borderRadius: '50%',
            background: statusColors[status],
            border: '2px solid #0f0f23',
          }}
        />
      )}
    </div>
  );
}
