'use client';

import React from 'react';
import Tooltip from '../ui/Tooltip';

interface SidebarItem {
  id: string;
  icon: string;
  label: string;
  badge?: number;
}

interface SidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({
  items,
  activeItem,
  onItemClick,
  collapsed = false,
  onToggle,
}: SidebarProps) {
  return (
    <aside
      style={{
        width: collapsed ? '56px' : '200px', // Reduced from 64px/240px
        height: '100%',
        background: 'rgba(15, 15, 35, 0.6)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(124, 58, 237, 0.15)', // More muted purple
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Navigation Items */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.1875rem' }}>
        {items.map((item) => {
          const isActive = activeItem === item.id;
          const content = (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem', // Reduced from 0.75rem
                padding: collapsed ? '0.625rem' : '0.625rem 0.875rem', // Reduced padding
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? 'rgba(124, 58, 237, 0.15)' : 'transparent', // More muted purple
                border: 'none',
                borderRadius: '8px', // Reduced from 10px
                cursor: 'pointer',
                color: isActive ? '#a78bfa' : '#64748b', // Softer colors
                fontSize: '0.8125rem', // Reduced from 0.875rem
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(124, 58, 237, 0.08)';
                  e.currentTarget.style.color = '#a78bfa';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              <span style={{ fontSize: '1rem' }}>{item.icon}</span> {/* Reduced from 1.125rem */}
              {!collapsed && <span>{item.label}</span>}
              {item.badge && item.badge > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '0.125rem 0.4375rem', // Slightly tighter
                    fontSize: '0.625rem', // Reduced from 0.6875rem
                    fontWeight: 600,
                    background: 'rgba(124, 58, 237, 0.2)',
                    color: '#a78bfa',
                    borderRadius: '9999px',
                  }}
                >
                  {item.badge}
                </span>
              )}
              {/* Active indicator */}
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '60%',
                    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', // More muted gradient
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
            </button>
          );

          return collapsed ? (
            <Tooltip key={item.id} content={item.label} position="right">
              {content}
            </Tooltip>
          ) : (
            <React.Fragment key={item.id}>{content}</React.Fragment>
          );
        })}
      </nav>

      {/* Toggle button */}
      {onToggle && (
        <div style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid rgba(124, 58, 237, 0.15)' }}>
          <button
            onClick={onToggle}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem', // Reduced
              padding: '0.5rem', // Reduced
              background: 'rgba(124, 58, 237, 0.08)',
              border: '1px solid rgba(124, 58, 237, 0.2)',
              borderRadius: '6px', // Reduced
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '0.6875rem', // Reduced
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(124, 58, 237, 0.15)';
              e.currentTarget.style.color = '#a78bfa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(124, 58, 237, 0.08)';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            {collapsed ? '→' : '←'}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
