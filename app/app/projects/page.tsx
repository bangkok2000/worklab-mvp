'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  conversationCount: number;
  insightCount: number;
  color: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PROJECT_COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Check if we should auto-open the modal from query param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('new') === 'true') {
        setShowNewProject(true);
        // Clean up URL without scroll
        const url = new URL(window.location.href);
        url.searchParams.delete('new');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  }, []);

  const loadProjects = () => {
    if (!isMounted) return;
    try {
      const saved = localStorage.getItem('moonscribe-projects');
      if (saved) {
        const projectsList = JSON.parse(saved);
        
        // Count insights per project
        const insightsData = localStorage.getItem('moonscribe_insights_v2');
        let insightsByProject: Record<string, number> = {};
        if (insightsData) {
          const parsed = JSON.parse(insightsData);
          if (parsed.insights) {
            parsed.insights.forEach((i: any) => {
              if (!i.isArchived && i.projectId) {
                insightsByProject[i.projectId] = (insightsByProject[i.projectId] || 0) + 1;
              }
            });
          }
        }
        
        setProjects(projectsList.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          tags: p.tags || [],
          insightCount: insightsByProject[p.id] || 0, // Use actual count from insights
        })));
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  };

  useEffect(() => {
    loadProjects();
    
    // Listen for insight changes to update project counts
    const handleInsightChange = () => {
      loadProjects();
    };
    window.addEventListener('moonscribe-insights-changed', handleInsightChange);
    window.addEventListener('storage', handleInsightChange);

    return () => {
      window.removeEventListener('moonscribe-insights-changed', handleInsightChange);
      window.removeEventListener('storage', handleInsightChange);
    };
  }, [isMounted]);

  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem('moonscribe-projects', JSON.stringify(newProjects));
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
      documentCount: 0,
      conversationCount: 0,
      insightCount: 0,
      color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    saveProjects([...projects, newProject]);
    setNewProjectName('');
    setNewProjectDesc('');
    setShowNewProject(false);
    // Navigate to the new project
    router.push(`/app/projects/${newProject.id}`);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === id);
    const projectName = project?.name || 'this project';
    
    if (confirm(`Are you sure you want to delete "${projectName}"?\n\nThis will permanently delete:\n• All documents and sources\n• All conversations\n• All insights\n\nThis action cannot be undone.`)) {
      saveProjects(projects.filter(p => p.id !== id));
      localStorage.removeItem(`moonscribe-project-${id}-documents`);
      localStorage.removeItem(`moonscribe-project-${id}-conversations`);
      localStorage.removeItem(`moonscribe-project-content-${id}`);
    }
  };

  const filteredProjects = projects
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>📁 Projects</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Organize your sources and research into projects
          </p>
        </div>
        <button
          onClick={() => setShowNewProject(true)}
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
          + New Project
        </button>
      </div>

      {/* Search & Filters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        gap: '1rem',
      }}>
        <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.5rem',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '8px',
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

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            padding: '0.25rem',
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.5rem 0.75rem',
                background: viewMode === 'grid' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: viewMode === 'grid' ? '#c4b5fd' : '#64748b',
                cursor: 'pointer',
              }}
            >
              ▦
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.5rem 0.75rem',
                background: viewMode === 'list' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: viewMode === 'list' ? '#c4b5fd' : '#64748b',
                cursor: 'pointer',
              }}
            >
              ☰
            </button>
          </div>

          <select style={{
            padding: '0.5rem 1rem',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '8px',
            color: '#94a3b8',
            fontSize: '0.875rem',
            outline: 'none',
          }}>
            <option>Last Updated</option>
            <option>Name</option>
            <option>Created</option>
          </select>
        </div>
      </div>

      {/* Projects */}
      {filteredProjects.length === 0 ? (
        <div style={{
          padding: '4rem',
          background: 'rgba(15, 15, 35, 0.6)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderRadius: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📁</div>
          <h3 style={{ color: '#f1f5f9', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            {searchQuery ? 'Try a different search' : 'Create your first project to start organizing your research'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowNewProject(true)}
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
              + Create Your First Project
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1rem',
        }}>
          {filteredProjects.map(project => (
            <ProjectCard 
              key={project.id} 
              project={project}
              onClick={() => router.push(`/app/projects/${project.id}`)}
              onDelete={(e) => handleDeleteProject(project.id, e)}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredProjects.map(project => (
            <ProjectListItem
              key={project.id}
              project={project}
              onClick={() => router.push(`/app/projects/${project.id}`)}
              onDelete={(e) => handleDeleteProject(project.id, e)}
            />
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowNewProject(false)}>
          <div style={{
            width: '100%',
            maxWidth: '500px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px',
            overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Create New Project</h2>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., AI Research, Client Analysis"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '0.9375rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                  Description (optional)
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="What's this project about?"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowNewProject(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
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
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: newProjectName.trim() ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' : 'rgba(100, 116, 139, 0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: newProjectName.trim() ? 'white' : '#64748b',
                    fontWeight: 500,
                    cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onClick, onDelete }: { 
  project: Project; 
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '1.5rem',
        background: isHovered ? 'rgba(139, 92, 246, 0.1)' : 'rgba(15, 15, 35, 0.6)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        position: 'relative',
      }}
    >
      {/* Color Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '1rem',
        right: '1rem',
        height: '3px',
        background: project.color,
        borderRadius: '0 0 2px 2px',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `${project.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
        }}>
          📁
        </div>
        <button
          onClick={onDelete}
          style={{
            padding: '0.375rem 0.75rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#f87171',
            fontSize: '0.75rem',
            fontWeight: 500,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
          title="Delete project"
        >
          🗑️ Delete
        </button>
      </div>

      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>
        {project.name}
      </h3>

      {project.description && (
        <p style={{
          fontSize: '0.875rem',
          color: '#94a3b8',
          marginBottom: '1rem',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {project.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{
          background: 'rgba(139, 92, 246, 0.1)',
          color: '#c4b5fd',
          padding: '0.25rem 0.75rem',
          borderRadius: '6px',
          fontSize: '0.75rem',
        }}>
          📄 {project.documentCount} docs
        </span>
        <span style={{
          background: 'rgba(99, 102, 241, 0.1)',
          color: '#a5b4fc',
          padding: '0.25rem 0.75rem',
          borderRadius: '6px',
          fontSize: '0.75rem',
        }}>
          💬 {project.conversationCount} chats
        </span>
        <span style={{
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#6ee7b7',
          padding: '0.25rem 0.75rem',
          borderRadius: '6px',
          fontSize: '0.75rem',
        }}>
          💡 {project.insightCount} insights
        </span>
      </div>

      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1rem' }}>
        Updated {formatRelativeDate(project.updatedAt)}
      </p>
    </div>
  );
}

function ProjectListItem({ project, onClick, onDelete }: {
  project: Project;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '1rem 1.5rem',
        background: 'rgba(15, 15, 35, 0.6)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        background: `${project.color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem',
        flexShrink: 0,
      }}>
        📁
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 500, color: '#f1f5f9', marginBottom: '0.25rem' }}>
          {project.name}
        </h3>
        {project.description && (
          <p style={{
            fontSize: '0.8125rem',
            color: '#64748b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {project.description}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
        <span>📄 {project.documentCount}</span>
        <span>💬 {project.conversationCount}</span>
        <span>💡 {project.insightCount}</span>
      </div>

      <span style={{ color: '#64748b', fontSize: '0.8125rem', minWidth: '100px', textAlign: 'right' }}>
        {formatRelativeDate(project.updatedAt)}
      </span>

      <button
        onClick={onDelete}
        style={{
          padding: '0.375rem 0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#f87171',
          fontSize: '0.75rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
        title="Delete project"
      >
        🗑️ Delete
      </button>
    </div>
  );
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}
