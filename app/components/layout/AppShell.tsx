'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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

const bottomNav: NavItem[] = [
  { id: 'integrations', label: 'Integrations', icon: '🔌', href: '/app/integrations' },
  { id: 'settings', label: 'Settings', icon: '⚙️', href: '/app/settings' },
];

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['library']);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

        {/* Quick Capture Button */}
        <div style={{ padding: sidebarCollapsed ? '0.75rem' : '1rem' }}>
          <button
            onClick={() => setShowQuickCapture(true)}
            style={{
              width: '100%',
              padding: sidebarCollapsed ? '0.75rem' : '0.75rem 1rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '0.5rem',
              transition: 'all 0.2s',
            }}
          >
            <span>+</span>
            {!sidebarCollapsed && <span>Add Content</span>}
          </button>
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
              onNavigate={(href) => router.push(href)}
            />
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div style={{
          padding: '0.5rem',
          borderTop: '1px solid rgba(139, 92, 246, 0.1)',
        }}>
          {bottomNav.map(item => (
            <NavItemComponent
              key={item.id}
              item={item}
              collapsed={sidebarCollapsed}
              isActive={isActive}
              expandedItems={expandedItems}
              onToggleExpand={toggleExpanded}
              onNavigate={(href) => router.push(href)}
            />
          ))}
          
          {/* Collapse Toggle */}
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
              marginTop: '0.5rem',
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
            position: 'relative',
          }}>
            <input
              type="text"
              placeholder="Search everything... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 1rem 0.625rem 2.5rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '10px',
                color: '#f1f5f9',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            <span style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
            }}>
              🔍
            </span>
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              color: '#c4b5fd',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              🔔
            </button>
            <button style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              color: '#c4b5fd',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              ❓
            </button>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              U
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
        }}>
          {children}
        </main>
      </div>

      {/* Quick Capture Modal */}
      {showQuickCapture && (
        <QuickCaptureModal onClose={() => setShowQuickCapture(false)} />
      )}
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
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: (href: string) => boolean;
  expandedItems: string[];
  onToggleExpand: (id: string) => void;
  onNavigate: (href: string) => void;
}) {
  const active = isActive(item.href);
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.includes(item.id);

  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <button
        onClick={() => {
          if (hasChildren && !collapsed) {
            onToggleExpand(item.id);
          } else {
            onNavigate(item.href);
          }
        }}
        style={{
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
        }}
      >
        <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{item.icon}</span>
        {!collapsed && (
          <>
            <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
            {hasChildren && (
              <span style={{
                fontSize: '0.75rem',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}>
                ▶
              </span>
            )}
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
      </button>

      {/* Children */}
      {hasChildren && !collapsed && isExpanded && (
        <div style={{ paddingLeft: '1.5rem', marginTop: '0.25rem' }}>
          {item.children!.map(child => (
            <button
              key={child.id}
              onClick={() => onNavigate(child.href)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                background: isActive(child.href) ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: isActive(child.href) ? '#c4b5fd' : '#64748b',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.125rem',
              }}
            >
              <span style={{ fontSize: '0.875rem' }}>{child.icon}</span>
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Quick Capture Modal
function QuickCaptureModal({ onClose }: { onClose: () => void }) {
  const [captureType, setCaptureType] = useState<'url' | 'note' | 'upload'>('url');
  const [inputValue, setInputValue] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('inbox');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  // Load projects
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moonscribe-projects');
      if (saved) {
        setProjects(JSON.parse(saved).map((p: any) => ({ id: p.id, name: p.name })));
      }
    }
  }, []);

  const captureTypes = [
    { id: 'url', label: 'URL / Link', icon: '🔗', placeholder: 'Paste URL (YouTube, article, website...)' },
    { id: 'note', label: 'Quick Note', icon: '📝', placeholder: 'Type a quick note...' },
    { id: 'upload', label: 'Upload File', icon: '📤', placeholder: 'Drop files or click to upload' },
  ];

  const handleSave = () => {
    if (!inputValue.trim() && captureType !== 'upload') {
      return; // Don't save empty content
    }

    // Detect content type from URL
    let detectedType: string = captureType;
    let title = inputValue.substring(0, 60);
    
    if (captureType === 'url') {
      const url = inputValue.toLowerCase();
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        detectedType = 'youtube';
        title = 'YouTube Video';
      } else if (url.includes('tiktok.com')) {
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
          {captureType === 'upload' ? (
            <div style={{
              border: '2px dashed rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
              <p style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Drop files here or click to upload</p>
              <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                PDF, Word, Audio, Video supported
              </p>
            </div>
          ) : (
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
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
            ⌘+Enter to save
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.625rem 1.25rem',
                background: 'transparent',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              style={{
                padding: '0.625rem 1.25rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {selectedProject === 'inbox' ? 'Add to Inbox' : 'Add to Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
