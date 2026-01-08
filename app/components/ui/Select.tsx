'use client';

import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
  error?: string;
}

const sizes = {
  sm: { padding: '0.375rem 0.75rem', fontSize: '0.8125rem' },
  md: { padding: '0.5rem 0.875rem', fontSize: '0.875rem' },
  lg: { padding: '0.625rem 1rem', fontSize: '0.9375rem' },
};

export default function Select({
  label,
  options,
  size = 'md',
  error,
  style,
  ...props
}: SelectProps) {
  const selectStyle: React.CSSProperties = {
    width: '100%',
    ...sizes[size],
    background: 'rgba(0, 0, 0, 0.2)',
    border: `1px solid ${error ? 'rgba(239, 68, 68, 0.5)' : 'rgba(139, 92, 246, 0.2)'}`,
    borderRadius: '10px',
    color: '#f1f5f9',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    paddingRight: '2.5rem',
    ...style,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {label && (
        <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#94a3b8' }}>
          {label}
        </label>
      )}
      <select
        style={selectStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>
      )}
    </div>
  );
}
