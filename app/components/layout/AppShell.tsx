'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import CreditBalance from '@/app/components/features/CreditBalance';
import BuyCreditsModal from '@/app/components/features/BuyCreditsModal';
import { GuestUsageIndicator } from '@/app/components/features/GuestUsageIndicator';
import { SignUpRequiredModal } from '@/app/components/features/SignUpRequiredModal';
import { getGuestUsage, getGuestLimit } from '@/lib/utils/guest-limits';
import Skeleton from '@/app/components/ui/Skeleton';
import Input from '@/app/components/ui/Input';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '/app' },
  { id: 'inbox', label: 'Inbox', icon: '📥', href: '/app/inbox' },
  { id: 'projects', label: 'Projects', icon: '📁', href: '/app/projects' },
  { id: 'insights', label: 'Insights', icon: '💡', href: '/app/insights' },
  { 
    id: 'library', 
    label: 'Library', 
    icon: '📚', 
    href: '/app/library',
    children: [
      { id: 'documents', label: 'Documents', icon: '📄', href: '/app/library/documents' },
      { id: 'media', label: 'Media', icon: '🎬', href: '/app/library/media' },
      { id: 'web', label: 'Web & Articles', icon: '🌐', href: '/app/library/web' },
      { id: 'notes', label: 'Notes', icon: '📝', href: '/app/library/notes' },
    ]
  },
  { id: 'team', label: 'Team', icon: '👥', href: '/app/team' },
];

// Settings moved to header, bottomNav now empty
const bottomNav: NavItem[] = [];

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['library']);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showSignUpRequired, setShowSignUpRequired] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Listen for custom event to open Add Content modal from project pages
  useEffect(() => {
    const handleOpenAddContent = (e: CustomEvent) => {
      setShowQuickCapture(true);
    };
    window.addEventListener('moonscribe-open-add-content', handleOpenAddContent as EventListener);
    return () => window.removeEventListener('moonscribe-open-add-content', handleOpenAddContent as EventListener);
  }, []);

  // Get user initials or email initial
  const getUserInitial = () => {
    if (!user) return 'G';
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name.charAt(0).toUpperCase();
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  // Get display name - fallback to email username if no full_name
  const getDisplayName = () => {
    if (!user) return 'Guest';
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    // Extract username from email (before @)
    if (user.email) {
      const username = user.email.split('@')[0];
      // Capitalize first letter and format
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return 'User';
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/signin');
  };

  const userMenuButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    textAlign: 'left',
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // TODO: Open command palette
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowQuickCapture(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app';
    return pathname.startsWith(href);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f23 50%, #1a1a2e 100%)',
      color: '#f1f5f9',
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? '64px' : '260px',
        minWidth: sidebarCollapsed ? '64px' : '260px',
        height: '100%',
        background: 'rgba(10, 10, 26, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(139, 92, 246, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed ? '1rem 0.75rem' : '1.25rem 1rem',
          borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            flexShrink: 0,
          }}>
            🌙
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
              }}>
                MoonScribe
              </h1>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0.5rem', overflowY: 'auto' }}>
          {navigation.map(item => (
            <NavItemComponent
              key={item.id}
              item={item}
              collapsed={sidebarCollapsed}
              isActive={isActive}
              expandedItems={expandedItems}
              onToggleExpand={toggleExpanded}
            />
          ))}
        </nav>

        {/* Bottom - Collapse Toggle */}
        <div style={{
          padding: '0.5rem',
          borderTop: '1px solid rgba(139, 92, 246, 0.1)',
        }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1rem' }}>{sidebarCollapsed ? '→' : '←'}</span>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Header */}
        <header style={{
          height: '60px',
          padding: '0 1.5rem',
          background: 'rgba(15, 15, 35, 0.6)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          {/* Search */}
          <div style={{
            flex: 1,
            maxWidth: '500px',
          }}>
            <Input
              type="text"
              placeholder="Search everything... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              inputSize="sm"
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              }
            />
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Credit Balance for signed-in users, Guest indicator for guests */}
            {loading ? (
              // Show skeleton during auth loading to prevent flicker
              <div style={{
                width: '80px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Skeleton width="80px" height="32px" variant="rounded" animation="pulse" />
              </div>
            ) : (
              <>
                {user ? (
                  <CreditBalance 
                    compact 
                    onBuyCredits={() => setShowBuyCredits(true)}
                    authLoading={loading}
                  />
                ) : (
                  <GuestUsageIndicator 
                    onSignUpClick={() => setShowSignUpRequired(true)} 
                  />
                )}
              </>
            )}
            
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => { setShowNotifications(!showNotifications); setShowHelp(false); }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: showNotifications ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  color: '#c4b5fd',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                🔔
              </button>
              {showNotifications && (
                <>
                  <div 
                    onClick={() => setShowNotifications(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  />
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '0.5rem',
                    width: '320px',
                    background: 'rgba(15, 15, 35, 0.95)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '12px',
                    padding: '0.5rem',
                    zIndex: 50,
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                  }}>
                    <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Notifications</h3>
                    </div>
                    <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
                      <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No new notifications</p>
                      <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        You're all caught up!
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Help */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => { setShowHelp(!showHelp); setShowNotifications(false); }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: showHelp ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  color: '#c4b5fd',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                ❓
              </button>
              {showHelp && (
                <>
                  <div 
                    onClick={() => setShowHelp(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  />
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '0.5rem',
                    width: '280px',
                    background: 'rgba(15, 15, 35, 0.95)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '12px',
                    padding: '0.5rem',
                    zIndex: 50,
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                  }}>
                    <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Help & Resources</h3>
                    </div>
                    <div style={{ padding: '0.25rem' }}>
                      <button onClick={() => setShowHelp(false)} style={{ width: '100%', padding: '0.625rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem', textAlign: 'left' }}>
                        <span>📚</span> Documentation
                      </button>
                      <button onClick={() => setShowHelp(false)} style={{ width: '100%', padding: '0.625rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem', textAlign: 'left' }}>
                        <span>⌨️</span> Keyboard Shortcuts
                      </button>
                      <button onClick={() => setShowHelp(false)} style={{ width: '100%', padding: '0.625rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem', textAlign: 'left' }}>
                        <span>💬</span> Contact Support
                      </button>
                      <button onClick={() => setShowHelp(false)} style={{ width: '100%', padding: '0.625rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem', textAlign: 'left' }}>
                        <span>💡</span> Feature Requests
                      </button>
                      <div style={{ height: '1px', background: 'rgba(139, 92, 246, 0.15)', margin: '0.5rem 0' }} />
                      <button onClick={() => setShowHelp(false)} style={{ width: '100%', padding: '0.625rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '8px', color: '#64748b', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem', textAlign: 'left' }}>
                        <span>ℹ️</span> About MoonScribe
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Settings */}
            <Link
              href="/app/settings"
              prefetch={true}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: pathname.includes('/settings') ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                color: '#c4b5fd',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}>
              ⚙️
            </Link>
            {/* User Menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: user 
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                    : 'rgba(139, 92, 246, 0.2)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#f1f5f9',
                  cursor: 'pointer',
                }}
              >
                {getUserInitial()}
              </button>
              
              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    onClick={() => setShowUserMenu(false)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 40,
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '0.5rem',
                    width: '280px',
                    background: 'rgba(15, 15, 35, 0.95)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '12px',
                    padding: '0.5rem',
                    zIndex: 50,
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                  }}>
                    {user ? (
                      <>
                        {/* User Info */}
                        <div style={{
                          padding: '0.75rem',
                          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
                          marginBottom: '0.5rem',
                        }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#f1f5f9' }}>
                            {getDisplayName()}
                          </div>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#64748b', 
                            marginTop: '0.125rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {user.email}
                          </div>
                        </div>
                        
                        {/* Menu Items */}
                        <button
                          onClick={() => { router.push('/app/settings'); setShowUserMenu(false); }}
                          style={userMenuButtonStyle}
                        >
                          <span>⚙️</span> Settings
                        </button>
                        <div style={{ height: '1px', background: 'rgba(139, 92, 246, 0.15)', margin: '0.5rem 0' }} />
                        <button
                          onClick={handleSignOut}
                          style={{ ...userMenuButtonStyle, color: '#f87171' }}
                        >
                          <span>🚪</span> Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Guest Mode */}
                        <div style={{
                          padding: '0.75rem',
                          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
                          marginBottom: '0.5rem',
                        }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#f1f5f9' }}>
                            Guest Mode
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                            Sign in to sync & save
                          </div>
                        </div>
                        <button
                          onClick={() => { router.push('/auth/signin'); setShowUserMenu(false); }}
                          style={userMenuButtonStyle}
                        >
                          <span>🔑</span> Sign In
                        </button>
                        <button
                          onClick={() => { router.push('/auth/signup'); setShowUserMenu(false); }}
                          style={userMenuButtonStyle}
                        >
                          <span>✨</span> Create Account
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          paddingBottom: '5rem', /* Space for FAB */
        }}>
          {children}
        </main>
      </div>

      {/* Floating Action Button (FAB) for Add Content */}
      <button
        onClick={() => setShowQuickCapture(true)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          border: 'none',
          color: 'white',
          fontSize: '1.5rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
          transition: 'all 0.2s ease',
          zIndex: 50,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.4)';
        }}
        title="Add Content (⌘N)"
      >
        +
      </button>

      {/* Quick Capture Modal */}
      {showQuickCapture && (
        <QuickCaptureModal 
          onClose={() => setShowQuickCapture(false)}
          defaultProjectId={pathname.includes('/projects/') ? pathname.split('/projects/')[1]?.split('/')[0] : undefined}
        />
      )}

      {/* Buy Credits Modal */}
      <BuyCreditsModal 
        isOpen={showBuyCredits} 
        onClose={() => setShowBuyCredits(false)} 
      />

      {/* Sign Up Required Modal (for guests who hit limit) */}
      <SignUpRequiredModal
        isOpen={showSignUpRequired}
        onClose={() => setShowSignUpRequired(false)}
        queriesUsed={getGuestUsage().queriesUsed}
        queryLimit={getGuestLimit()}
      />
    </div>
  );
}

// Navigation Item Component
function NavItemComponent({
  item,
  collapsed,
  isActive,
  expandedItems,
  onToggleExpand,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: (href: string) => boolean;
  expandedItems: string[];
  onToggleExpand: (id: string) => void;
}) {
  const active = isActive(item.href);
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.includes(item.id);

  const navItemStyle: React.CSSProperties = {
    width: '100%',
    padding: collapsed ? '0.75rem' : '0.625rem 0.75rem',
    background: active ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: active ? '#c4b5fd' : '#94a3b8',
    fontSize: '0.875rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: '0.75rem',
    transition: 'all 0.15s',
    position: 'relative',
    textDecoration: 'none',
  };

  // If has children, use button for expand/collapse
  if (hasChildren && !collapsed) {
    return (
      <div style={{ marginBottom: '0.25rem' }}>
        <button
          onClick={() => onToggleExpand(item.id)}
          style={navItemStyle}
        >
          <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{item.icon}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
          <span style={{
            fontSize: '0.75rem',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}>
            ▶
          </span>
          {active && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '3px',
              height: '60%',
              background: '#8b5cf6',
              borderRadius: '0 2px 2px 0',
            }} />
          )}
        </button>

        {/* Children - using Link for prefetching */}
        {isExpanded && (
          <div style={{ paddingLeft: '1.5rem', marginTop: '0.25rem' }}>
            {item.children!.map(child => (
              <Link
                key={child.id}
                href={child.href}
                prefetch={true}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  background: isActive(child.href) ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                  borderRadius: '6px',
                  color: isActive(child.href) ? '#c4b5fd' : '#64748b',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.125rem',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '0.875rem' }}>{child.icon}</span>
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Use Link for direct navigation with prefetching
  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <Link
        href={item.href}
        prefetch={true}
        style={navItemStyle}
      >
        <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{item.icon}</span>
        {!collapsed && (
          <>
            <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
            {item.badge && (
              <span style={{
                background: '#8b5cf6',
                color: 'white',
                fontSize: '0.6875rem',
                padding: '0.125rem 0.5rem',
                borderRadius: '10px',
              }}>
                {item.badge}
              </span>
            )}
          </>
        )}
        {active && (
          <div style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3px',
            height: '60%',
            background: '#8b5cf6',
            borderRadius: '0 2px 2px 0',
          }} />
        )}
      </Link>
    </div>
  );
}

// Quick Capture Modal
function QuickCaptureModal({ onClose, defaultProjectId }: { onClose: () => void; defaultProjectId?: string }) {
  const { user } = useAuth();
  const [captureType, setCaptureType] = useState<'url' | 'note' | 'upload'>('url');
  const [inputValue, setInputValue] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>(defaultProjectId || 'inbox');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Load projects
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moonscribe-projects');
      if (saved) {
        setProjects(JSON.parse(saved).map((p: any) => ({ id: p.id, name: p.name })));
      }
    }
  }, []);

  // Check if URL is a YouTube video
  const isYouTubeUrl = (url: string): boolean => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  // Check if URL is a valid web URL (not YouTube)
  const isWebUrl = (url: string): boolean => {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    return (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('.')) 
      && !isYouTubeUrl(trimmed);
  };

  // Get API key using the correct utility function
  const getApiKey = async (): Promise<string | undefined> => {
    try {
      const { getDecryptedApiKey } = await import('@/lib/utils/api-keys');
      return await getDecryptedApiKey('openai', user?.id || null) || undefined;
    } catch (error) {
      console.error('Failed to get API key:', error);
      return undefined;
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setError('');
    setProcessingStatus('Uploading file...');

    try {
      const apiKey = await getApiKey();
      const formData = new FormData();
      formData.append('file', file);
      if (selectedProject !== 'inbox') {
        formData.append('projectId', selectedProject);
      }
      if (apiKey) {
        formData.append('apiKey', apiKey);
      }

      // Detect file type and route to appropriate endpoint
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/') || 
                     file.name.toLowerCase().endsWith('.mp3') ||
                     file.name.toLowerCase().endsWith('.wav') ||
                     file.name.toLowerCase().endsWith('.m4a');
      
      let endpoint = '/api/upload';
      let processingStatus = 'Processing file...';
      
      if (isImage) {
        endpoint = '/api/image';
        processingStatus = 'Analyzing image...';
      } else if (isAudio) {
        endpoint = '/api/audio';
        processingStatus = 'Transcribing audio...';
      }
      
      setProcessingStatus(processingStatus);
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = isImage ? 'process image' : isAudio ? 'transcribe audio' : 'upload file';
        throw new Error(data.error || `Failed to ${errorMsg}`);
      }

      setProcessingStatus('Saving to library...');

      // Create the content item (different structure for images, audio, and documents)
      let newItem: any;
      
      if (isImage) {
        newItem = {
          id: data.imageId || `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'image',
          title: data.filename || file.name,
          filename: data.filename,
          fileType: data.fileType,
          fileSize: data.fileSize,
          analysis: data.analysis,
          extractedText: data.extractedText,
          chunksProcessed: 1, // Images are stored as single chunk
          processed: true,
          addedAt: new Date().toISOString(),
        };
      } else if (isAudio) {
        newItem = {
          id: data.audioId || `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'audio',
          title: data.filename || file.name,
          filename: data.filename,
          fileType: data.fileType,
          fileSize: data.fileSize,
          transcript: data.transcript,
          duration: data.duration,
          durationMinutes: data.durationMinutes,
          segments: data.segments,
          chunksProcessed: data.chunks || 0,
          processed: true,
          addedAt: new Date().toISOString(),
        };
      } else {
        newItem = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'document',
          title: data.filename || file.name,
          filename: data.filename,
          chunksProcessed: data.chunks || 0,
          processed: true,
          addedAt: new Date().toISOString(),
        };
      }

      // Save to local storage
      if (typeof window !== 'undefined') {
        if (selectedProject === 'inbox') {
          const existingInbox = localStorage.getItem('moonscribe-inbox');
          const inbox = existingInbox ? JSON.parse(existingInbox) : [];
          inbox.unshift(newItem);
          localStorage.setItem('moonscribe-inbox', JSON.stringify(inbox));
        } else {
          const existingContent = localStorage.getItem(`moonscribe-project-content-${selectedProject}`);
          const content = existingContent ? JSON.parse(existingContent) : [];
          content.unshift(newItem);
          localStorage.setItem(`moonscribe-project-content-${selectedProject}`, JSON.stringify(content));
        }
        
        window.dispatchEvent(new CustomEvent('moonscribe-content-added', { detail: newItem }));
      }

      setProcessingStatus('Done!');
      setTimeout(() => onClose(), 500);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setIsProcessing(false);
    }
  };

  const captureTypes = [
    { id: 'url', label: 'URL / Link', icon: '🔗', placeholder: 'Paste URL (YouTube, article, website...)' },
    { id: 'note', label: 'Quick Note', icon: '📝', placeholder: 'Type a quick note...' },
    { id: 'upload', label: 'Upload File', icon: '📤', placeholder: 'Drop files or click to upload' },
  ];

  // Process YouTube video via API
  const processYouTube = async (url: string): Promise<any> => {
    setProcessingStatus('Fetching video info...');
    const apiKey = await getApiKey();
    
    setProcessingStatus('Extracting transcript...');
    
    const response = await fetch('/api/youtube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        projectId: selectedProject === 'inbox' ? null : selectedProject,
        apiKey,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to process YouTube video');
    }

    return data;
  };

  // Process web page via API
  const processWebPage = async (url: string): Promise<any> => {
    setProcessingStatus('Fetching page...');
    const apiKey = await getApiKey();
    
    setProcessingStatus('Extracting content...');
    
    const response = await fetch('/api/web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        projectId: selectedProject === 'inbox' ? null : selectedProject,
        apiKey,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to process web page');
    }

    return data;
  };

  const handleSave = async () => {
    if (!inputValue.trim() && captureType !== 'upload') {
      return; // Don't save empty content
    }

    setError('');

    // Check if it's a YouTube URL - process it via API
    if (captureType === 'url' && isYouTubeUrl(inputValue)) {
      setIsProcessing(true);
      try {
        const result = await processYouTube(inputValue);
        setProcessingStatus('Saving to library...');
        
        // Create the content item with YouTube metadata
        const newItem = {
          id: `youtube-${result.videoId}-${Date.now()}`,
          type: 'youtube',
          title: result.title,
          url: result.url,
          thumbnail: result.thumbnail,
          author: result.author,
          videoId: result.videoId,
          chunksProcessed: result.chunksProcessed,
          duration: result.totalDuration,
          processed: true, // Mark as processed (indexed in Pinecone)
          addedAt: new Date().toISOString(),
        };

        // Save to local storage
        if (typeof window !== 'undefined') {
          if (selectedProject === 'inbox') {
            const existingInbox = localStorage.getItem('moonscribe-inbox');
            const inbox = existingInbox ? JSON.parse(existingInbox) : [];
            inbox.unshift(newItem);
            localStorage.setItem('moonscribe-inbox', JSON.stringify(inbox));
          } else {
            const existingContent = localStorage.getItem(`moonscribe-project-content-${selectedProject}`);
            const content = existingContent ? JSON.parse(existingContent) : [];
            content.unshift(newItem);
            localStorage.setItem(`moonscribe-project-content-${selectedProject}`, JSON.stringify(content));
          }
          
          window.dispatchEvent(new CustomEvent('moonscribe-content-added', { detail: newItem }));
        }
        
        setProcessingStatus('Done!');
        setTimeout(() => onClose(), 500);
        return;
      } catch (err: any) {
        setError(err.message || 'Failed to process YouTube video');
        setIsProcessing(false);
        return;
      }
    }

    // Check if it's a web URL - process it via web scraper API
    if (captureType === 'url' && isWebUrl(inputValue)) {
      setIsProcessing(true);
      try {
        const result = await processWebPage(inputValue);
        setProcessingStatus('Saving to library...');
        
        // Create the content item with web page metadata
        const newItem = {
          id: result.pageId,
          type: 'article',
          title: result.title,
          description: result.description,
          url: result.url,
          domain: result.domain,
          favicon: result.favicon,
          thumbnail: result.image,
          author: result.author,
          publishedDate: result.publishedDate,
          chunksProcessed: result.chunksProcessed,
          processed: true, // Mark as processed (indexed in Pinecone)
          addedAt: new Date().toISOString(),
        };

        // Save to local storage
        if (typeof window !== 'undefined') {
          if (selectedProject === 'inbox') {
            const existingInbox = localStorage.getItem('moonscribe-inbox');
            const inbox = existingInbox ? JSON.parse(existingInbox) : [];
            inbox.unshift(newItem);
            localStorage.setItem('moonscribe-inbox', JSON.stringify(inbox));
          } else {
            const existingContent = localStorage.getItem(`moonscribe-project-content-${selectedProject}`);
            const content = existingContent ? JSON.parse(existingContent) : [];
            content.unshift(newItem);
            localStorage.setItem(`moonscribe-project-content-${selectedProject}`, JSON.stringify(content));
          }
          
          window.dispatchEvent(new CustomEvent('moonscribe-content-added', { detail: newItem }));
        }
        
        setProcessingStatus('Done!');
        setTimeout(() => onClose(), 500);
        return;
      } catch (err: any) {
        setError(err.message || 'Failed to process web page');
        setIsProcessing(false);
        return;
      }
    }

    // For notes and other content, use the original logic
    let detectedType: string = captureType;
    let title = inputValue.substring(0, 60);
    
    if (captureType === 'url') {
      // Fallback for URLs that weren't processed (shouldn't happen often)
      const url = inputValue.toLowerCase();
      if (url.includes('tiktok.com')) {
        detectedType = 'tiktok';
        title = 'TikTok Video';
      } else {
        detectedType = 'article';
        title = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      }
    } else if (captureType === 'note') {
      detectedType = 'note';
      title = inputValue.split('\n')[0].substring(0, 60) || 'Untitled Note';
    }

    const newItem = {
      id: `inbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: detectedType,
      title: title,
      content: captureType === 'note' ? inputValue : undefined,
      url: captureType === 'url' ? inputValue : undefined,
      addedAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      if (selectedProject === 'inbox') {
        // Save to inbox
        const existingInbox = localStorage.getItem('moonscribe-inbox');
        const inbox = existingInbox ? JSON.parse(existingInbox) : [];
        inbox.unshift(newItem); // Add to beginning
        localStorage.setItem('moonscribe-inbox', JSON.stringify(inbox));
        console.log('Saved to Inbox:', newItem);
      } else {
        // Save directly to project
        const existingContent = localStorage.getItem(`moonscribe-project-content-${selectedProject}`);
        const content = existingContent ? JSON.parse(existingContent) : [];
        content.unshift(newItem);
        localStorage.setItem(`moonscribe-project-content-${selectedProject}`, JSON.stringify(content));
        console.log('Saved to Project:', selectedProject, newItem);
      }
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('moonscribe-content-added', { detail: newItem }));
    }
    
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem',
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: '600px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Add Content</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '1.25rem',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Type Selector */}
        <div style={{
          display: 'flex',
          padding: '1rem 1.5rem',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
        }}>
          {captureTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setCaptureType(type.id as typeof captureType)}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: captureType === type.id ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                border: captureType === type.id ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
                borderRadius: '10px',
                color: captureType === type.id ? '#c4b5fd' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{type.icon}</span>
              <span style={{ fontSize: '0.75rem' }}>{type.label}</span>
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div style={{ padding: '1.5rem' }}>
          {/* Processing State */}
          {isProcessing && (
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              marginBottom: '1rem',
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '3px solid rgba(139, 92, 246, 0.3)',
                borderTopColor: '#8b5cf6',
                borderRadius: '50%',
                margin: '0 auto 1rem',
                animation: 'spin 1s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ color: '#c4b5fd', fontWeight: 500, marginBottom: '0.25rem' }}>
                {isYouTubeUrl(inputValue) ? 'Processing YouTube Video' : 'Processing Web Page'}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                {processingStatus}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <div>
                <p style={{ color: '#fca5a5', fontWeight: 500, marginBottom: '0.25rem' }}>
                  {captureType === 'url' && isYouTubeUrl(inputValue) 
                    ? 'Error processing video'
                    : captureType === 'url' && isWebUrl(inputValue)
                    ? 'Error processing web page'
                    : captureType === 'upload'
                    ? 'Error processing file'
                    : 'Error processing content'}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* YouTube Preview (when URL is YouTube) */}
          {captureType === 'url' && inputValue && isYouTubeUrl(inputValue) && !isProcessing && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>🎬</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: 500 }}>
                  YouTube Video Detected
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  We'll extract the transcript and make it searchable
                </p>
              </div>
            </div>
          )}

          {/* Web Page Preview (when URL is a web page) */}
          {captureType === 'url' && inputValue && isWebUrl(inputValue) && !isProcessing && (
            <div style={{
              background: 'rgba(20, 184, 166, 0.05)',
              border: '1px solid rgba(20, 184, 166, 0.2)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>🌐</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: 500 }}>
                  Web Page Detected
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  We'll extract the article content and make it searchable
                </p>
              </div>
            </div>
          )}

          {!isProcessing && captureType === 'upload' ? (
            <div 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                // Use MIME types for better browser compatibility - image/* accepts all image types
                input.accept = 'application/pdf,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx,text/plain,.txt,audio/*,.mp3,.wav,video/*,.mp4,image/*,.jpg,.jpeg,.png,.gif,.webp';
                input.multiple = false;
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    await handleFileUpload(file);
                  }
                };
                input.click();
              }}
              style={{
                border: '2px dashed rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                padding: '3rem',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '1rem',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
              <p style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Drop files here or click to upload</p>
              <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                PDF, Images, Audio (MP3, WAV, M4A), Video supported
              </p>
            </div>
          ) : !isProcessing && (
            <textarea
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setError(''); }}
              placeholder={captureTypes.find(t => t.id === captureType)?.placeholder}
              style={{
                width: '100%',
                minHeight: captureType === 'note' ? '120px' : '60px',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '10px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                marginBottom: '1rem',
              }}
              autoFocus
            />
          )}

          {/* Project Selector */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              color: '#94a3b8',
              marginBottom: '0.5rem',
            }}>
              📁 Add to Project <span style={{ color: '#64748b' }}>(optional)</span>
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="inbox">📥 Inbox (Organize later)</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  📁 {project.name}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
              {selectedProject === 'inbox' 
                ? 'Content will be saved to your Inbox. You can assign it to a project later.'
                : 'Content will be added directly to this project.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(139, 92, 246, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            {captureType === 'url' && inputValue && isYouTubeUrl(inputValue) 
              ? '🎬 YouTube will be processed'
              : captureType === 'url' && inputValue && isWebUrl(inputValue)
                ? '🌐 Web page will be processed' 
                : '⌘+Enter to save'}
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              disabled={isProcessing}
              style={{
                padding: '0.625rem 1.25rem',
                background: 'transparent',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                color: '#94a3b8',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isProcessing || (!inputValue.trim() && captureType !== 'upload')}
              style={{
                padding: '0.625rem 1.25rem',
                background: isProcessing 
                  ? 'rgba(139, 92, 246, 0.5)' 
                  : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 500,
                cursor: isProcessing || (!inputValue.trim() && captureType !== 'upload') ? 'not-allowed' : 'pointer',
                opacity: (!inputValue.trim() && captureType !== 'upload') ? 0.5 : 1,
              }}
            >
              {isProcessing 
                ? 'Processing...' 
                : captureType === 'url' && inputValue && (isYouTubeUrl(inputValue) || isWebUrl(inputValue))
                  ? 'Process & Add'
                  : selectedProject === 'inbox' 
                    ? 'Add to Inbox' 
                    : 'Add to Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
