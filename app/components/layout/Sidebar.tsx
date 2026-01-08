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
        width: collapsed ? '64px' : '240px',
        height: '100%',
        background: 'rgba(15, 15, 35, 0.6)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(139, 92, 246, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Navigation Items */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
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
                gap: '0.75rem',
                padding: collapsed ? '0.75rem' : '0.75rem 1rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                color: isActive ? '#c4b5fd' : '#94a3b8',
                fontSize: '0.875rem',
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
                  e.currentTarget.style.color = '#c4b5fd';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }
              }}
            >
              <span style={{ fontSize: '1.125rem' }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {item.badge && item.badge > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '0.125rem 0.5rem',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    background: 'rgba(139, 92, 246, 0.2)',
                    color: '#c4b5fd',
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
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
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
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(139, 92, 246, 0.15)' }}>
          <button
            onClick={onToggle}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.625rem',
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '0.75rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
              e.currentTarget.style.color = '#c4b5fd';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
              e.currentTarget.style.color = '#94a3b8';
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
