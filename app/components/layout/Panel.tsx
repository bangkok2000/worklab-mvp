'use client';

import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  icon?: string;
  isOpen: boolean;
  onToggle: () => void;
  position: 'left' | 'right';
  width?: string;
  headerAction?: React.ReactNode;
}

export default function Panel({
  children,
  title,
  icon,
  isOpen,
  onToggle,
  position,
  width = '300px',
  headerAction,
}: PanelProps) {
  return (
    <>
      {/* Toggle Button - Rendered outside the panel for visibility */}
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          [position]: isOpen ? width : '0',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 100,
          width: '28px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: position === 'left' ? '0 10px 10px 0' : '10px 0 0 10px',
          cursor: 'pointer',
          color: '#8b5cf6',
          fontSize: '0.875rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)';
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)';
          e.currentTarget.style.color = '#8b5cf6';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }}
      >
        {position === 'left' ? (isOpen ? '◀' : '▶') : (isOpen ? '▶' : '◀')}
      </button>

      {/* Panel */}
      <div
        style={{
          width: isOpen ? width : '0',
          minWidth: isOpen ? width : '0',
          height: '100%',
          background: 'rgba(15, 15, 35, 0.6)',
          backdropFilter: 'blur(20px)',
          borderLeft: position === 'right' && isOpen ? '1px solid rgba(139, 92, 246, 0.15)' : 'none',
          borderRight: position === 'left' && isOpen ? '1px solid rgba(139, 92, 246, 0.15)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        {title && isOpen && (
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {icon && (
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'rgba(139, 92, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                  }}
                >
                  {icon}
                </span>
              )}
              <h2
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#f1f5f9',
                  margin: 0,
                }}
              >
                {title}
              </h2>
            </div>
            {headerAction}
          </div>
        )}

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
