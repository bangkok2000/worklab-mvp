'use client';

import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'purple' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  size = 'sm',
  children, 
  style,
  ...props 
}) => {
  const variantStyles: Record<string, { background: string; color: string }> = {
    default: { background: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8' },
    purple: { background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd' },
    success: { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
    warning: { background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
    error: { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
    info: { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
  };

  const sizeStyles: Record<string, { padding: string; fontSize: string }> = {
    sm: { padding: '0.25rem 0.625rem', fontSize: '0.75rem' },
    md: { padding: '0.375rem 0.875rem', fontSize: '0.8125rem' },
  };

  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '6px',
        fontWeight: 500,
        ...variantStyle,
        ...sizeStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
