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
    { label: 'Documents', value: 0, icon: '📄', color: '#8b5cf6' },
    { label: 'Media Files', value: 0, icon: '🎬', color: '#6366f1' },
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
      { label: 'Documents', value: docCount, icon: '📄', color: '#8b5cf6' },
      { label: 'Media Files', value: mediaCount, icon: '🎬', color: '#6366f1' },
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
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Welcome Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Welcome back! 👋
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
          Start by selecting a project or create a new one
        </p>
      </div>

      {/* ========== SECTION 1: PROJECTS (Primary Focus) ========== */}
      <section style={{
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        borderRadius: '16px',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, marginBottom: '0.25rem' }}>📁 Your Projects</h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>Everything starts here</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => router.push('/app/projects')}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                color: '#c4b5fd',
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
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
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
            padding: '3rem 2rem',
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
            <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Create your first project</h3>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              Projects help you organize sources, have focused AI conversations, and save insights on specific topics.
            </p>
            <button
              onClick={() => router.push('/app/projects?new=true')}
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
                  padding: '1.25rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '12px',
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
                    fontSize: '1.25rem',
                  }}>
                    📁
                  </div>
                  <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem' }}>{project.name}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
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
                border: '2px dashed rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: '100px',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>+</span>
              <span style={{ fontWeight: 500 }}>New Project</span>
            </button>
          </div>
        )}
      </section>

      {/* ========== SECTION 2: INSIGHTS ========== */}
      <section style={{
        padding: '1.5rem',
        background: 'rgba(15, 15, 35, 0.6)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        borderRadius: '16px',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, marginBottom: '0.25rem' }}>💡 Recent Insights</h2>
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: 0 }}>Saved answers from your AI conversations</p>
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
            padding: '2rem',
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
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                  {insight.title}
                </h3>
                <p style={{
                  fontSize: '0.8125rem',
                  color: '#94a3b8',
                  margin: 0,
                  marginBottom: '0.75rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {insight.preview}
                </p>
                {insight.projectName && (
                  <span style={{
                    fontSize: '0.6875rem',
                    color: '#8b5cf6',
                    background: 'rgba(139, 92, 246, 0.15)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                  }}>
                    📁 {insight.projectName}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========== SECTION 3: LIBRARY ========== */}
      <section style={{
        padding: '1.5rem',
        background: 'rgba(15, 15, 35, 0.6)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        borderRadius: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, marginBottom: '0.25rem' }}>📚 Library</h2>
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: 0 }}>All your content across projects</p>
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
                border: '1px solid rgba(139, 92, 246, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `${stat.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
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
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.75rem' }}>
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
                    color: '#c4b5fd',
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
