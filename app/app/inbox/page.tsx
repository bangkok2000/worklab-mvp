'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InboxItem {
  id: string;
  type: 'url' | 'note' | 'pdf' | 'youtube' | 'article';
  title: string;
  content?: string;
  url?: string;
  addedAt: Date;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  url: { icon: '🔗', label: 'URL', color: '#6366f1' },
  note: { icon: '📝', label: 'Note', color: '#8b5cf6' },
  pdf: { icon: '📄', label: 'PDF', color: '#ef4444' },
  youtube: { icon: '▶️', label: 'YouTube', color: '#ef4444' },
  tiktok: { icon: '🎵', label: 'TikTok', color: '#06b6d4' },
  article: { icon: '📰', label: 'Article', color: '#14b8a6' },
  audio: { icon: '🎧', label: 'Audio', color: '#f59e0b' },
  video: { icon: '🎬', label: 'Video', color: '#ec4899' },
  document: { icon: '📃', label: 'Document', color: '#3b82f6' },
};

export default function InboxPage() {
  const router = useRouter();
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const loadData = () => {
      if (typeof window !== 'undefined') {
        // Load inbox items
        const savedInbox = localStorage.getItem('moonscribe-inbox');
        if (savedInbox) {
          setInboxItems(JSON.parse(savedInbox).map((item: any) => ({
            ...item,
            addedAt: new Date(item.addedAt),
          })));
        }
        
        // Load projects
        const savedProjects = localStorage.getItem('moonscribe-projects');
        if (savedProjects) {
          setProjects(JSON.parse(savedProjects));
        }
      }
    };
    
    loadData();
    
    // Listen for new content being added
    const handleContentAdded = () => loadData();
    window.addEventListener('moonscribe-content-added', handleContentAdded);
    
    return () => {
      window.removeEventListener('moonscribe-content-added', handleContentAdded);
    };
  }, []);

  const displayItems = inboxItems;

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === displayItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(displayItems.map(i => i.id));
    }
  };

  const handleMoveToProject = (projectId: string) => {
    if (typeof window === 'undefined') return;
    
    // Get items to move
    const itemsToMove = inboxItems.filter(item => selectedItems.includes(item.id));
    const remainingItems = inboxItems.filter(item => !selectedItems.includes(item.id));
    
    // Add to project content
    const existingContent = localStorage.getItem(`moonscribe-project-content-${projectId}`);
    const projectContent = existingContent ? JSON.parse(existingContent) : [];
    const movedItems = itemsToMove.map(item => ({
      ...item,
      addedAt: item.addedAt.toISOString(),
    }));
    projectContent.unshift(...movedItems);
    localStorage.setItem(`moonscribe-project-content-${projectId}`, JSON.stringify(projectContent));
    
    // Remove from inbox
    setInboxItems(remainingItems);
    localStorage.setItem('moonscribe-inbox', JSON.stringify(
      remainingItems.map(item => ({
        ...item,
        addedAt: item.addedAt.toISOString(),
      }))
    ));
    
    console.log('Moved items', selectedItems, 'to project', projectId);
    setSelectedItems([]);
    setShowMoveModal(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete ${selectedItems.length} item(s) from Inbox?`)) {
      const remainingItems = inboxItems.filter(item => !selectedItems.includes(item.id));
      setInboxItems(remainingItems);
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('moonscribe-inbox', JSON.stringify(
          remainingItems.map(item => ({
            ...item,
            addedAt: item.addedAt.toISOString(),
          }))
        ));
      }
      
      setSelectedItems([]);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>📥 Inbox</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Content waiting to be organized into projects
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <span style={{
            padding: '0.5rem 1rem',
            background: 'rgba(139, 92, 246, 0.15)',
            borderRadius: '8px',
            color: '#c4b5fd',
            fontSize: '0.875rem',
          }}>
            {displayItems.length} item{displayItems.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div style={{
          padding: '0.875rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '12px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: '#c4b5fd', fontSize: '0.9375rem' }}>
            {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowMoveModal(true)}
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              📁 Move to Project
            </button>
            <button
              onClick={handleDelete}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Select All */}
      {displayItems.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={selectAll}
            style={{
              padding: '0.5rem 0.875rem',
              background: 'transparent',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '6px',
              color: '#94a3b8',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            {selectedItems.length === displayItems.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* Inbox Items */}
      {displayItems.length === 0 ? (
        <div style={{
          padding: '4rem',
          background: 'rgba(15, 15, 35, 0.6)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderRadius: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📥</div>
          <h3 style={{ color: '#f1f5f9', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Inbox is empty
          </h3>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Content you capture without assigning to a project will appear here. 
            You can organize it later.
          </p>
          <button
            onClick={() => {
              // Trigger the global FAB click which will open the Add Content modal
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('moonscribe-open-add-content'));
              }
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + Add Content
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {displayItems.map((item) => {
            const config = typeConfig[item.type];
            const isSelected = selectedItems.includes(item.id);
            
            return (
              <div
                key={item.id}
                style={{
                  padding: '1rem 1.25rem',
                  background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(15, 15, 35, 0.6)',
                  border: isSelected ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onClick={() => toggleSelect(item.id)}
              >
                {/* Checkbox */}
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  background: isSelected ? '#8b5cf6' : 'rgba(0, 0, 0, 0.2)',
                  border: isSelected ? 'none' : '2px solid rgba(139, 92, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  flexShrink: 0,
                }}>
                  {isSelected && '✓'}
                </div>

                {/* Icon */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: `${config.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                }}>
                  {config.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    color: '#f1f5f9',
                    marginBottom: '0.25rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    {config.label} • Added {formatRelativeDate(item.addedAt)}
                  </p>
                </div>

                {/* Quick Move Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItems([item.id]);
                    setShowMoveModal(true);
                  }}
                  style={{
                    padding: '0.5rem 0.875rem',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '6px',
                    color: '#c4b5fd',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  📁 Assign
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Move to Project Modal */}
      {showMoveModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowMoveModal(false)}>
          <div style={{
            width: '100%',
            maxWidth: '450px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px',
            overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                Move to Project
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
                Select a project for {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''}
              </p>
            </div>

            <div style={{ padding: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
              {projects.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>No projects yet</p>
                  <button
                    onClick={() => {
                      setShowMoveModal(false);
                      router.push('/app/projects');
                    }}
                    style={{
                      padding: '0.625rem 1.25rem',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    + Create Project
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => handleMoveToProject(project.id)}
                      style={{
                        padding: '1rem',
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(139, 92, 246, 0.15)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: `${project.color}25`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                      }}>
                        📁
                      </div>
                      <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{project.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(139, 92, 246, 0.1)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowMoveModal(false)}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
