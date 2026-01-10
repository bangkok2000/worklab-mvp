'use client';

import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  inputSize = 'md',
  style,
  ...props
}) => {
  const sizeStyles = {
    sm: { paddingVertical: '0.75rem', paddingHorizontal: '1rem', fontSize: '0.8125rem' }, // Increased from 0.5rem 0.75rem
    md: { paddingVertical: '0.875rem', paddingHorizontal: '1.125rem', fontSize: '0.9375rem' }, // Increased from 0.75rem 1rem
    lg: { paddingVertical: '1.125rem', paddingHorizontal: '1.5rem', fontSize: '1rem' }, // Increased from 1rem 1.25rem
  };

  const sizeStyle = sizeStyles[inputSize];
  const hasLeftIcon = !!leftIcon;

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: '#94a3b8',
          marginBottom: '0.5rem',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {leftIcon && (
          <div style={{
            position: 'absolute',
            left: '0.875rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#64748b',
            pointerEvents: 'none',
          }}>
            {leftIcon}
          </div>
        )}
        <input
          style={{
            width: '100%',
            background: 'rgba(0, 0, 0, 0.2)',
            border: error 
              ? '1px solid rgba(239, 68, 68, 0.5)' 
              : '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '10px',
            color: '#f1f5f9',
            outline: 'none',
            transition: 'all 0.2s',
            paddingLeft: hasLeftIcon ? '2.75rem' : sizeStyle.paddingHorizontal,
            paddingRight: sizeStyle.paddingHorizontal,
            paddingTop: sizeStyle.paddingVertical,
            paddingBottom: sizeStyle.paddingVertical,
            fontSize: sizeStyle.fontSize,
            ...style,
          }}
          {...props}
        />
      </div>
      {hint && !error && (
        <p style={{
          fontSize: '0.75rem',
          color: '#64748b',
          marginTop: '0.375rem',
        }}>
          {hint}
        </p>
      )}
      {error && (
        <p style={{
          fontSize: '0.75rem',
          color: '#f87171',
          marginTop: '0.375rem',
        }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
