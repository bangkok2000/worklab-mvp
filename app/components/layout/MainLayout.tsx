'use client';

import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  showSidebar?: boolean;
  status?: string;
  onSettingsClick?: () => void;
  onNewChat?: () => void;
}

const navItems = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'sources', icon: '📚', label: 'Sources' },
  { id: 'collections', icon: '📁', label: 'Collections' },
  { id: 'history', icon: '📜', label: 'History' },
];

export default function MainLayout({
  children,
  sidebar,
  showSidebar = true,
  status,
  onSettingsClick,
  onNewChat,
}: MainLayoutProps) {
  const [activeNav, setActiveNav] = useState('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f23 50%, #1a1a2e 100%)',
        overflow: 'hidden',
      }}
    >
      <Header
        status={status}
        onSettingsClick={onSettingsClick}
        onNewChat={onNewChat}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {showSidebar && (
          <Sidebar
            items={navItems}
            activeItem={activeNav}
            onItemClick={setActiveNav}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        {/* Main content area */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {children}
        </main>

        {/* Optional right sidebar */}
        {sidebar}
      </div>
    </div>
  );
}
