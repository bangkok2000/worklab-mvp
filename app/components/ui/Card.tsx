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
  sm: '0.625rem', // Reduced from 0.75rem
  md: '0.875rem', // Reduced from 1rem
  lg: '1.25rem', // Reduced from 1.5rem
};

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
  onClick,
}: CardProps) {
  const baseStyle: React.CSSProperties = {
    background: variant === 'elevated' ? 'rgba(124, 58, 237, 0.08)' : 'rgba(15, 15, 35, 0.6)', // More muted
    border: `1px solid ${variant === 'outlined' ? 'rgba(124, 58, 237, 0.25)' : 'rgba(124, 58, 237, 0.15)'}`, // More muted
    borderRadius: '10px', // Reduced from 12px
    padding: paddingMap[padding],
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: onClick || variant === 'interactive' ? 'pointer' : 'default',
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick || variant === 'interactive') {
      e.currentTarget.style.background = 'rgba(124, 58, 237, 0.12)'; // More muted
      e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.25)'; // More muted
      e.currentTarget.style.transform = 'translateY(-2px)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick || variant === 'interactive') {
      e.currentTarget.style.background = variant === 'elevated' ? 'rgba(124, 58, 237, 0.08)' : 'rgba(15, 15, 35, 0.6)'; // More muted
      e.currentTarget.style.borderColor = variant === 'outlined' ? 'rgba(124, 58, 237, 0.25)' : 'rgba(124, 58, 237, 0.15)'; // More muted
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
        padding: '0.875rem 1rem', // Reduced padding
        borderBottom: '1px solid rgba(124, 58, 237, 0.15)', // More muted
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
    <div style={{ padding: '0.875rem 1rem', ...style }}> {/* Reduced padding */}
      {children}
    </div>
  );
}

// Card Footer component
export function CardFooter({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: '0.875rem 1rem', // Reduced padding
        borderTop: '1px solid rgba(124, 58, 237, 0.15)', // More muted
        ...style,
      }}
    >
      {children}
    </div>
  );
}
