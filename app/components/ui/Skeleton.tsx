'use client';

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

export default function Skeleton({
  width = '100%',
  height = '1rem',
  variant = 'text',
  animation = 'wave',
}: SkeletonProps) {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'circular':
        return { borderRadius: '50%', width: height, height };
      case 'rectangular':
        return { borderRadius: '0' };
      case 'rounded':
        return { borderRadius: '12px' };
      default:
        return { borderRadius: '4px' };
    }
  };

  const getAnimationStyles = (): React.CSSProperties => {
    if (animation === 'none') return {};
    if (animation === 'pulse') {
      return { animation: 'pulse 2s ease-in-out infinite' };
    }
    return {
      background: `linear-gradient(
        90deg,
        rgba(139, 92, 246, 0.1) 25%,
        rgba(139, 92, 246, 0.2) 50%,
        rgba(139, 92, 246, 0.1) 75%
      )`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    };
  };

  return (
    <div
      style={{
        width,
        height,
        background: 'rgba(139, 92, 246, 0.1)',
        ...getVariantStyles(),
        ...getAnimationStyles(),
      }}
    />
  );
}

// Skeleton group for common patterns
export function SkeletonText({ lines = 3, spacing = '0.5rem' }: { lines?: number; spacing?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height="0.875rem"
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        padding: '1rem',
        background: 'rgba(15, 15, 35, 0.6)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <Skeleton variant="circular" width="40px" height="40px" />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height="0.875rem" />
          <div style={{ marginTop: '0.5rem' }}>
            <Skeleton width="40%" height="0.75rem" />
          </div>
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
