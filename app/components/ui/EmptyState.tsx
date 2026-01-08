'use client';

import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '3.5rem',
        marginBottom: '1rem',
        opacity: 0.7,
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 600,
        color: '#f1f5f9',
        marginBottom: '0.5rem',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: '0.9375rem',
          color: '#94a3b8',
          marginBottom: action ? '1.5rem' : 0,
          maxWidth: '400px',
        }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '0.9375rem',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
