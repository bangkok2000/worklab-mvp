'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const paddingMap = {
  none: '0',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
};

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
  onClick,
}: CardProps) {
  const baseStyle: React.CSSProperties = {
    background: variant === 'elevated' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(15, 15, 35, 0.6)',
    border: `1px solid ${variant === 'outlined' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.15)'}`,
    borderRadius: '12px',
    padding: paddingMap[padding],
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: onClick || variant === 'interactive' ? 'pointer' : 'default',
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick || variant === 'interactive') {
      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)';
      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick || variant === 'interactive') {
      e.currentTarget.style.background = variant === 'elevated' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(15, 15, 35, 0.6)';
      e.currentTarget.style.borderColor = variant === 'outlined' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.15)';
      e.currentTarget.style.transform = 'translateY(0)';
    }
  };

  return (
    <div
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

// Card Header component
export function CardHeader({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Card Body component
export function CardBody({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: '1rem 1.25rem', ...style }}>
      {children}
    </div>
  );
}

// Card Footer component
export function CardFooter({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: '1rem 1.25rem',
        borderTop: '1px solid rgba(139, 92, 246, 0.15)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
