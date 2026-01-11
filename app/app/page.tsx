'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  documentCount: number;
  updatedAt: Date;
  color: string;
}

interface Insight {
  id: string;
  title: string;
  preview: string;
  projectName?: string;
  createdAt: Date;
}

interface RecentContent {
  id: string;
  type: string;
  title: string;
  addedAt: string;
}

interface LibraryStat {
  label: string;
  value: number;
  icon: string;
  color: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [recentContent, setRecentContent] = useState<RecentContent[]>([]);
  const [libraryStats, setLibraryStats] = useState<LibraryStat[]>([
    { label: 'Documents', value: 0, icon: '📄', color: '#7c3aed' }, // More muted
    { label: 'Media Files', value: 0, icon: '🎬', color: '#5b21b6' }, // More muted
    { label: 'Web Pages', value: 0, icon: '🌐', color: '#3b82f6' },
  ]);
  const [isMounted, setIsMounted] = useState(false);

  const loadInsights = () => {
    if (typeof window !== 'undefined') {
      const savedInsightsData = localStorage.getItem('moonscribe_insights_v2');
      if (savedInsightsData) {
        const parsed = JSON.parse(savedInsightsData);
        if (parsed.insights && parsed.insights.length > 0) {
          const activeInsights = parsed.insights.filter((i: any) => !i.isArchived);
          setInsights(activeInsights.slice(0, 3).map((i: any) => ({
            id: i.id,
            title: i.title,
            preview: i.content?.substring(0, 100) || '',
            projectName: i.projectName || i.project,
            createdAt: new Date(i.createdAt),
          })));
        } else {
          setInsights([]);
        }
      } else {
        setInsights([]);
      }
    }
  };

  const loadLibraryStats = () => {
    if (typeof window === 'undefined') return;

    // Load all content from inbox and projects
    const allContent: RecentContent[] = [];
    let docCount = 0;
    let mediaCount = 0;
    let webCount = 0;

    // Get inbox content
    const inboxData = localStorage.getItem('moonscribe-inbox');
    if (inboxData) {
      const inboxItems = JSON.parse(inboxData);
      allContent.push(...inboxItems);
    }

    // Get content from all projects
    const projectsData = localStorage.getItem('moonscribe-projects');
    if (projectsData) {
      const projectsList = JSON.parse(projectsData);
      projectsList.forEach((project: any) => {
        const projectContent = localStorage.getItem(`moonscribe-project-content-${project.id}`);
        if (projectContent) {
          const items = JSON.parse(projectContent);
          allContent.push(...items);
        }
      });
    }

    // Count by type and set recent content
    allContent.forEach(item => {
      const type = item.type?.toLowerCase() || '';
      if (type === 'document' || type === 'pdf') docCount++;
      else if (type === 'youtube' || type === 'podcast' || type === 'audio' || type === 'tiktok' || type === 'image' || type === 'video') mediaCount++;
      else if (type === 'article' || type === 'url' || type === 'bookmark') webCount++;
    });

    // Sort by date and take recent 4
    const sorted = allContent.sort((a, b) => 
      new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    ).slice(0, 4);
    
    setRecentContent(sorted);
    setLibraryStats([
      { label: 'Documents', value: docCount, icon: '📄', color: '#7c3aed' }, // More muted
      { label: 'Media Files', value: mediaCount, icon: '🎬', color: '#5b21b6' }, // More muted
      { label: 'Web Pages', value: webCount, icon: '🌐', color: '#3b82f6' },
    ]);
  };

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      // Load projects
      const savedProjects = localStorage.getItem('moonscribe-projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects).slice(0, 4).map((p: any) => ({
          ...p,
          updatedAt: new Date(p.updatedAt),
        })));
      }

      // Load insights
      loadInsights();

      // Load library stats
      loadLibraryStats();

      // Listen for insight changes
      const handleInsightChange = () => {
        loadInsights();
      };
      
      // Listen for content changes
      const handleContentAdded = () => {
        loadLibraryStats();
      };

      const handleStorageChange = () => {
        handleInsightChange();
        handleContentAdded();
      };

      window.addEventListener('moonscribe-insights-changed', handleInsightChange);
      window.addEventListener('moonscribe-content-added', handleContentAdded);
      window.addEventListener('storage', handleStorageChange); // Also listen for cross-tab changes

      return () => {
        window.removeEventListener('moonscribe-insights-changed', handleInsightChange);
        window.removeEventListener('moonscribe-content-added', handleContentAdded);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, []);

  const contentTypeIcons: Record<string, string> = {
    pdf: '📄',
    document: '📄',
    youtube: '▶️',
    url: '🔗',
    article: '🌐',
    note: '📝',
    podcast: '🎙️',
    audio: '🎵',
    tiktok: '📱',
    bookmark: '🔖',
    image: '🖼️',
    video: '🎬',
    mp3: '🎵',
    wav: '🎵',
    m4a: '🎵',
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', minHeight: 'calc(100vh - 56px)' }}> {/* Reduced padding, ensure full height */}
      {/* Welcome Section */}
      <div style={{ marginBottom: '1.5rem' }}> {/* Reduced margin */}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.375rem' }}> {/* Reduced font and margin */}
          Welcome back! 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}> {/* More muted, reduced font */}
          Start by selecting a project or create a new one
        </p>
      </div>

      {/* ========== SECTION 1: PROJECTS (Primary Focus) ========== */}
      <section style={{
        padding: '1.25rem', // Reduced
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(91, 33, 182, 0.04) 100%)', // More muted
        border: '1px solid rgba(124, 58, 237, 0.2)', // More muted
        borderRadius: '12px', // Reduced
        marginBottom: '1.25rem', // Reduced
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, marginBottom: '0.25rem' }}>📁 Your Projects</h2> {/* Reduced from 1.25rem */}
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>Everything starts here</p> {/* Reduced font, more muted */}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => router.push('/app/projects')}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: '1px solid rgba(124, 58, 237, 0.25)', // More muted
                borderRadius: '6px', // Reduced
                color: '#a78bfa', // Softer purple
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              View All
            </button>
            <button
              onClick={() => router.push('/app/projects?new=true')}
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', // More muted
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + New Project
            </button>
          </div>
        </div>
        
        {projects.length === 0 ? (
          <div style={{
            padding: '2rem 1.5rem', // Reduced padding
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
            <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Create your first project</h3>
            <p style={{ color: '#64748b', marginBottom: '1.25rem', maxWidth: '400px', margin: '0 auto 1.25rem' }}> {/* More muted, reduced margin */}
              Projects help you organize sources, have focused AI conversations, and save insights on specific topics.
            </p>
            <button
              onClick={() => router.push('/app/projects?new=true')}
              style={{
                padding: '0.625rem 1.25rem', // Reduced padding
                background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', // More muted
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '0.9375rem',
              }}
            >
              + Create Your First Project
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/app/projects/${project.id}`)}
                style={{
                  padding: '1rem', // Reduced from 1.25rem
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(124, 58, 237, 0.15)', // More muted
                  borderRadius: '10px', // Reduced from 12px
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: `${project.color}25`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.125rem', // Reduced from 1.25rem
                  }}>
                    📁
                  </div>
                  <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem' }}>{project.name}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.8125rem' }}> {/* More muted */}
                  {project.documentCount} sources • Updated {formatRelativeDate(project.updatedAt)}
                </div>
              </button>
            ))}
            
            {/* Quick add project card */}
            <button
              onClick={() => router.push('/app/projects?new=true')}
              style={{
                padding: '1.25rem',
                background: 'transparent',
                border: '2px dashed rgba(124, 58, 237, 0.25)', // More muted
                borderRadius: '10px', // Reduced from 12px
                cursor: 'pointer',
                textAlign: 'center',
                color: '#7c3aed', // More muted
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: '100px',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>+</span> {/* Reduced from 1.5rem */}
              <span style={{ fontWeight: 500 }}>New Project</span>
            </button>
          </div>
        )}
      </section>

      {/* ========== SECTION 2: INSIGHTS ========== */}
      <section style={{
        padding: '1.5rem',
        background: 'rgba(15, 15, 35, 0.6)',
        border: '1px solid rgba(124, 58, 237, 0.15)', // More muted
                borderRadius: '12px', // Reduced from 16px
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, marginBottom: '0.25rem' }}>💡 Recent Insights</h2> {/* Reduced from 1.125rem */}
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>Saved answers from your AI conversations</p> {/* More muted */}
          </div>
          <button
            onClick={() => router.push('/app/insights')}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b5cf6',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            View All →
          </button>
        </div>
        
        {insights.length === 0 ? (
          <div style={{
            padding: '1.5rem', // Reduced from 2rem
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '10px',
          }}>
            <p style={{ color: '#64748b', margin: 0 }}>No insights yet. Start a conversation in a project to save insights!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
            {insights.map((insight) => (
              <div
                key={insight.id}
                onClick={() => router.push('/app/insights')}
                style={{
                  padding: '1rem',
                  background: 'rgba(124, 58, 237, 0.08)', // More muted
                  border: '1px solid rgba(124, 58, 237, 0.15)', // More muted
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                  {insight.title}
                </h3>
                <p style={{
                  fontSize: '0.8125rem',
                  color: '#64748b', // More muted
                  margin: 0,
                  marginBottom: '0.75rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {insight.preview}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {insight.projectName && (
                    <span style={{
                      fontSize: '0.6875rem',
                      color: '#7c3aed', // More muted
                      background: 'rgba(139, 92, 246, 0.15)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                    }}>
                      📁 {insight.projectName}
                    </span>
                  )}
                  <span style={{
                    fontSize: '0.6875rem',
                    color: '#64748b',
                  }}>
                    {formatRelativeDate(insight.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========== SECTION 3: LIBRARY ========== */}
      <section style={{
        padding: '1.5rem',
        background: 'rgba(15, 15, 35, 0.6)',
        border: '1px solid rgba(124, 58, 237, 0.15)', // More muted
                borderRadius: '12px', // Reduced from 16px
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, marginBottom: '0.25rem' }}>📚 Library</h2> {/* Reduced from 1.125rem */}
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>All your content across projects</p> {/* More muted */}
          </div>
          <button
            onClick={() => router.push('/app/library')}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b5cf6',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            View Library →
          </button>
        </div>

        {/* Library Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          {libraryStats.map((stat, idx) => (
            <div
              key={idx}
              onClick={() => router.push('/app/library')}
              style={{
                padding: '1.25rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(124, 58, 237, 0.1)', // More muted
                borderRadius: '10px', // Reduced from 12px
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px', // Reduced from 12px
                background: `${stat.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem', // Reduced from 1.5rem
              }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}> {/* Reduced font, softer white */}
                  {stat.value}
                </p>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Recently Added */}
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b', marginBottom: '0.625rem' }}> {/* Reduced font and margin */}
            Recently Added
          </h3>
          {recentContent.length === 0 ? (
            <div style={{
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
            }}>
              <p style={{ color: '#64748b', margin: 0 }}>No content yet. Use the + button to add content!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentContent.map((content) => (
                <div
                  key={content.id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{contentTypeIcons[content.type] || '📄'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#f1f5f9', fontSize: '0.875rem' }}>{content.title}</div>
                    <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>
                      {formatRelativeDate(new Date(content.addedAt))}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(139, 92, 246, 0.15)',
                    borderRadius: '4px',
                    fontSize: '0.6875rem',
                    color: '#a78bfa', // Softer purple
                    textTransform: 'uppercase',
                  }}>
                    {content.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  // Format time as HH:MM
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  // Format date
  if (days === 0) {
    if (minutes < 1) return 'Just now';
    if (hours < 1) return `${minutes}m ago`;
    return `Today ${timeStr}`;
  }
  if (days === 1) return `Yesterday ${timeStr}`;
  if (days < 7) return `${days}d ago ${timeStr}`;
  
  // For older dates, show full date and time
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
  return `${dateStr} ${timeStr}`;
}
