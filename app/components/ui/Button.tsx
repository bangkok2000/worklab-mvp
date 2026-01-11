'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  style,
  ...props
}) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', // More muted purple
      color: 'white',
      border: 'none',
    },
    secondary: {
      background: 'rgba(124, 58, 237, 0.1)', // More muted
      color: '#a78bfa', // Softer purple
      border: '1px solid rgba(124, 58, 237, 0.25)', // More muted
    },
    ghost: {
      background: 'transparent',
      color: '#64748b', // More muted gray
      border: '1px solid transparent',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.1)',
      color: '#f87171',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0.4375rem 0.75rem', fontSize: '0.8125rem' }, // Reduced padding
    md: { padding: '0.5625rem 1rem', fontSize: '0.875rem' }, // Reduced padding and font
    lg: { padding: '0.75rem 1.5rem', fontSize: '0.9375rem' }, // Reduced padding and font
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        borderRadius: '6px', // Reduced from 8px
        fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : 'auto',
        ...style,
      }}
      {...props}
    >
      {isLoading && (
        <span style={{
          width: '1em',
          height: '1em',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }} />
      )}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

export default Button;
