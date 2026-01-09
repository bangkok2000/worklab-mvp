'use client';

import React, { useState, useEffect } from 'react';

interface Insight {
  id: string;
  title: string;
  originalQuery: string; // The question that generated this insight
  content: string;
  sources: { id: string; title: string; type: string; relevance?: number }[];
  tags: string[];
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  isStarred: boolean;
  isPublic: boolean;
  isArchived: boolean; // New: Archive support
  shareLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

type SortOption = 'newest' | 'oldest' | 'alphabetical' | 'project';

// Demo insights
const demoInsights: Insight[] = [
  {
    id: '1',
    title: 'Key Differences Between RAG and Fine-tuning',
    originalQuery: 'What are the main differences between RAG and fine-tuning approaches for LLMs?',
    content: `RAG (Retrieval-Augmented Generation) and fine-tuning are two distinct approaches to enhancing LLM capabilities:

**RAG Approach:**
- Retrieves relevant external knowledge at query time
- No model weight changes required
- Easy to update knowledge by changing the document store
- Better for factual, up-to-date information
- More transparent with source citations

**Fine-tuning Approach:**
- Permanently modifies model weights
- Requires retraining for knowledge updates
- Better for learning specific styles or behaviors
- Can be more compute-intensive
- Knowledge is "baked in" to the model`,
    sources: [
      { id: 's1', title: 'Research Paper on RAG Systems.pdf', type: 'pdf', relevance: 94 },
      { id: 's2', title: 'Introduction to Vector Databases', type: 'youtube', relevance: 87 },
    ],
    tags: ['AI', 'RAG', 'Machine Learning'],
    projectId: 'proj-1',
    projectName: 'AI Research',
    projectColor: '#8b5cf6',
    isStarred: true,
    isPublic: false,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Best Practices for Document Chunking',
    originalQuery: 'How should I chunk documents for optimal RAG retrieval performance?',
    content: `When processing documents for RAG systems, chunking strategy significantly impacts retrieval quality:

1. **Semantic Chunking**: Split by meaning, not fixed size
2. **Overlap**: Include 10-20% overlap between chunks
3. **Metadata Preservation**: Keep source info, page numbers
4. **Optimal Size**: 500-1500 tokens typically works best
5. **Hierarchy**: Consider parent-child chunk relationships`,
    sources: [
      { id: 's3', title: 'LangChain Documentation', type: 'url', relevance: 91 },
    ],
    tags: ['RAG', 'Best Practices'],
    isStarred: false,
    isPublic: true,
    isArchived: false,
    shareLink: 'https://moonscribe.app/share/abc123',
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: '3',
    title: 'Vector Database Comparison Summary',
    originalQuery: 'Compare the top vector databases for production RAG systems - which should I use?',
    content: `Comparison of popular vector databases for RAG applications:

| Database | Managed | Open Source | Hybrid Search |
|----------|---------|-------------|---------------|
| Pinecone | ✓ | ✗ | ✓ |
| Weaviate | ✓ | ✓ | ✓ |
| Qdrant | ✓ | ✓ | ✓ |
| Milvus | ✓ | ✓ | ✓ |
| ChromaDB | ✗ | ✓ | ✗ |

Key considerations: Cost, scalability, filtering capabilities, and integration complexity.`,
    sources: [
      { id: 's4', title: 'Vector DB Benchmarks', type: 'article', relevance: 96 },
      { id: 's5', title: 'Choosing a Vector Database', type: 'youtube', relevance: 88 },
    ],
    tags: ['Databases', 'Comparison'],
    projectId: 'proj-1',
    projectName: 'AI Research',
    projectColor: '#8b5cf6',
    isStarred: true,
    isPublic: false,
    isArchived: false,
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 172800000),
  },
];

const STORAGE_KEY = 'moonscribe_insights_v2'; // Version 2 with proper structure

interface StoredInsightsData {
  version: number;
  initialized: boolean;
  insights: Insight[];
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Load insights from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      
      if (saved) {
        const data: StoredInsightsData = JSON.parse(saved);
        
        // Check if it's our new format with version
        if (data.version && data.initialized) {
          // User has used the app before - load their data (even if empty array)
          const loadedInsights = (data.insights || []).map((i: Insight) => ({
            ...i,
            isArchived: i.isArchived ?? false,
            createdAt: new Date(i.createdAt),
            updatedAt: new Date(i.updatedAt),
          }));
          setInsights(loadedInsights);
        } else {
          // Old format or corrupted - treat as first time user
          setInsights(demoInsights);
        }
      } else {
        // First time user - load demo insights
        setInsights(demoInsights);
      }
    } catch {
      // Error parsing - load demo insights
      setInsights(demoInsights);
    }
    setIsLoaded(true);
  }, []);

  // Save insights to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      const dataToSave: StoredInsightsData = {
        version: 2,
        initialized: true,
        insights: insights,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [insights, isLoaded]);

  const allTags = Array.from(new Set(insights.flatMap(i => i.tags)));
  const allProjects = Array.from(new Set(insights.filter(i => i.projectName).map(i => ({ 
    id: i.projectId, 
    name: i.projectName!, 
    color: i.projectColor 
  }))));
  // Deduplicate projects by id
  const uniqueProjects = allProjects.filter((p, idx) => 
    allProjects.findIndex(x => x.id === p.id) === idx
  );

  // Filter insights
  const filteredInsights = insights
    .filter(insight => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = insight.title.toLowerCase().includes(query) ||
        insight.content.toLowerCase().includes(query) ||
        insight.originalQuery.toLowerCase().includes(query) ||
        (insight.projectName?.toLowerCase().includes(query) ?? false);
      const matchesTag = !filterTag || insight.tags.includes(filterTag);
      const matchesStarred = !showStarredOnly || insight.isStarred;
      const matchesProject = !filterProject || insight.projectId === filterProject;
      const matchesArchived = showArchived ? insight.isArchived : !insight.isArchived;
      return matchesSearch && matchesTag && matchesStarred && matchesProject && matchesArchived;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'project':
          return (a.projectName || 'zzz').localeCompare(b.projectName || 'zzz');
        default:
          return 0;
      }
    });

  const activeCount = insights.filter(i => !i.isArchived).length;
  const archivedCount = insights.filter(i => i.isArchived).length;

  const toggleStar = (id: string) => {
    setInsights(prev => prev.map(i => 
      i.id === id ? { ...i, isStarred: !i.isStarred, updatedAt: new Date() } : i
    ));
    if (selectedInsight?.id === id) {
      setSelectedInsight(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
    }
  };

  const toggleArchive = (id: string) => {
    setInsights(prev => prev.map(i => 
      i.id === id ? { ...i, isArchived: !i.isArchived, updatedAt: new Date() } : i
    ));
    // Deselect if archiving current selection
    if (selectedInsight?.id === id) {
      setSelectedInsight(null);
    }
  };

  const deleteInsight = (id: string) => {
    setInsights(prev => prev.filter(i => i.id !== id));
    setSelectedInsight(null);
    setShowDeleteConfirm(false);
  };

  const updateInsight = (updated: Insight) => {
    setInsights(prev => prev.map(i => 
      i.id === updated.id ? { ...updated, updatedAt: new Date() } : i
    ));
    setSelectedInsight(updated);
    setShowEditModal(false);
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left Panel - List */}
      <div style={{
        width: '400px',
        minWidth: '400px',
        borderRight: '1px solid rgba(139, 92, 246, 0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>💡 Insights</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{
                background: showArchived ? 'rgba(100, 116, 139, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                padding: '0.25rem 0.75rem',
                borderRadius: '10px',
                fontSize: '0.8125rem',
                color: showArchived ? '#94a3b8' : '#c4b5fd',
              }}>
                {showArchived ? `${archivedCount} archived` : `${activeCount} saved`}
              </span>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <input
              type="text"
              placeholder="Search insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 1rem 0.625rem 2.25rem',
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
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              fontSize: '0.875rem',
            }}>
              🔍
            </span>
          </div>

          {/* Filters Row */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Starred Toggle */}
            <button
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              style={{
                padding: '0.375rem 0.75rem',
                background: showStarredOnly ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                border: showStarredOnly ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '6px',
                color: showStarredOnly ? '#fbbf24' : '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              ⭐ Starred
            </button>

            {/* Archive Toggle */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              style={{
                padding: '0.375rem 0.75rem',
                background: showArchived ? 'rgba(100, 116, 139, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                border: showArchived ? '1px solid rgba(100, 116, 139, 0.4)' : '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '6px',
                color: showArchived ? '#e2e8f0' : '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              📦 {showArchived ? 'Archived' : 'Archive'} {archivedCount > 0 && `(${archivedCount})`}
            </button>

            {/* Project Dropdown */}
            <select
              value={filterProject || ''}
              onChange={(e) => setFilterProject(e.target.value || null)}
              style={{
                padding: '0.375rem 0.625rem',
                background: filterProject ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                border: filterProject ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '6px',
                color: filterProject ? '#c4b5fd' : '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '100px',
              }}
            >
              <option value="">All Projects</option>
              {uniqueProjects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {/* Tag Dropdown */}
            <select
              value={filterTag || ''}
              onChange={(e) => setFilterTag(e.target.value || null)}
              style={{
                padding: '0.375rem 0.625rem',
                background: filterTag ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                border: filterTag ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '6px',
                color: filterTag ? '#c4b5fd' : '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '80px',
              }}
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {(filterProject || filterTag || showStarredOnly) && (
              <button
                onClick={() => {
                  setFilterProject(null);
                  setFilterTag(null);
                  setShowStarredOnly(false);
                }}
                style={{
                  padding: '0.375rem 0.5rem',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Sort Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                padding: '0.375rem 0.625rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '6px',
                color: '#c4b5fd',
                fontSize: '0.75rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alphabetical">Alphabetical (A-Z)</option>
              <option value="project">By Project</option>
            </select>
          </div>
        </div>

        {/* Insights List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {filteredInsights.map(insight => (
            <div
              key={insight.id}
              onClick={() => setSelectedInsight(insight)}
              style={{
                padding: '1rem',
                background: selectedInsight?.id === insight.id ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                border: selectedInsight?.id === insight.id ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
                borderRadius: '12px',
                cursor: 'pointer',
                marginBottom: '0.75rem',
                transition: 'all 0.15s',
              }}
            >
              {/* Project Badge - Top */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {insight.projectName ? (
                    <span style={{
                      background: `${insight.projectColor || '#8b5cf6'}20`,
                      color: insight.projectColor || '#a78bfa',
                      padding: '0.2rem 0.625rem',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: insight.projectColor || '#8b5cf6',
                      }}></span>
                      {insight.projectName}
                    </span>
                  ) : (
                    <span style={{
                      background: 'rgba(100, 116, 139, 0.15)',
                      color: '#94a3b8',
                      padding: '0.2rem 0.625rem',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                    }}>
                      No Project
                    </span>
                  )}
                  {insight.isPublic && (
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#34d399',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                    }}>
                      🔗
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleStar(insight.id); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    color: insight.isStarred ? '#fbbf24' : '#475569',
                    padding: 0,
                  }}
                >
                  {insight.isStarred ? '★' : '☆'}
                </button>
              </div>

              {/* Title */}
              <h3 style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: '#f1f5f9',
                marginBottom: '0.375rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {insight.title}
              </h3>

              {/* Original Query */}
              <p style={{
                fontSize: '0.8125rem',
                color: '#94a3b8',
                marginBottom: '0.625rem',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                fontStyle: 'italic',
              }}>
                Q: {insight.originalQuery}
              </p>

              {/* Meta Row */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                fontSize: '0.6875rem',
                color: '#64748b',
              }}>
                {/* Sources count */}
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  📚 {insight.sources.length} source{insight.sources.length !== 1 ? 's' : ''}
                </span>
                
                {/* Date */}
                <span>
                  {formatRelativeDate(insight.createdAt)}
                </span>

                {/* Tags (show first 2) */}
                {insight.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      color: '#94a3b8',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '3px',
                      fontSize: '0.625rem',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {filteredInsights.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💭</div>
              <p>No insights found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Detail View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedInsight ? (
          <>
            {/* Insight Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
            }}>
              {/* Top bar with project and actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {selectedInsight.projectName ? (
                    <span style={{
                      background: `${selectedInsight.projectColor || '#8b5cf6'}20`,
                      color: selectedInsight.projectColor || '#a78bfa',
                      padding: '0.375rem 0.875rem',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: selectedInsight.projectColor || '#8b5cf6',
                      }}></span>
                      {selectedInsight.projectName}
                    </span>
                  ) : (
                    <span style={{
                      background: 'rgba(100, 116, 139, 0.15)',
                      color: '#94a3b8',
                      padding: '0.375rem 0.875rem',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                    }}>
                      📥 From Inbox
                    </span>
                  )}
                  <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                    {formatRelativeDate(selectedInsight.createdAt)}
                  </span>
                </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setShowEditModal(true)}
                  style={{
                    padding: '0.5rem 0.875rem',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    color: '#c4b5fd',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => setShowExportModal(true)}
                  style={{
                    padding: '0.5rem 0.875rem',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    color: '#c4b5fd',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                >
                  📤 Export
                </button>
                <button style={{
                  padding: '0.5rem 0.875rem',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}>
                  🔗 Share
                </button>
              </div>
              </div>

              {/* Title and Original Query */}
              <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.625rem', color: '#f1f5f9' }}>
                {selectedInsight.title}
              </h2>

              {/* Original Query Box */}
              <div style={{
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
              }}>
                <div style={{ fontSize: '0.6875rem', color: '#8b5cf6', marginBottom: '0.25rem', fontWeight: 500 }}>
                  ORIGINAL QUESTION
                </div>
                <p style={{ color: '#e2e8f0', fontSize: '0.9375rem', margin: 0 }}>
                  {selectedInsight.originalQuery}
                </p>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedInsight.tags.map(tag => (
                  <span key={tag} style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    color: '#a78bfa',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Insight Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              <div style={{
                background: 'rgba(15, 15, 35, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}>
                <pre style={{
                  fontFamily: 'inherit',
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  color: '#e2e8f0',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}>
                  {selectedInsight.content}
                </pre>
              </div>

              {/* Sources */}
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>
                  📚 Sources ({selectedInsight.sources.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedInsight.sources.map((source, idx) => (
                    <div key={source.id} style={{
                      padding: '0.875rem 1rem',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.15)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                        }}>
                          {source.type === 'pdf' && '📄'}
                          {source.type === 'youtube' && '▶️'}
                          {source.type === 'url' && '🔗'}
                          {source.type === 'article' && '📰'}
                        </span>
                        <div>
                          <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: 500 }}>
                            [{idx + 1}] {source.title}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                            {source.type.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      {source.relevance && (
                        <div style={{
                          background: source.relevance > 90 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.1)',
                          color: source.relevance > 90 ? '#34d399' : '#a78bfa',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}>
                          {source.relevance}% match
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                gap: '2rem',
                fontSize: '0.8125rem',
                color: '#64748b',
              }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Created: </span>
                  {selectedInsight.createdAt.toLocaleDateString()}
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Updated: </span>
                  {selectedInsight.updatedAt.toLocaleDateString()}
                </div>
                {selectedInsight.isPublic && selectedInsight.shareLink && (
                  <div>
                    <span style={{ color: '#94a3b8' }}>Share Link: </span>
                    <span style={{ color: '#8b5cf6' }}>{selectedInsight.shareLink}</span>
                  </div>
                )}
              </div>

              {/* Actions Bar */}
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => toggleArchive(selectedInsight.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: selectedInsight.isArchived ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                      border: selectedInsight.isArchived ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
                      borderRadius: '8px',
                      color: selectedInsight.isArchived ? '#34d399' : '#94a3b8',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    {selectedInsight.isArchived ? '📤 Unarchive' : '📦 Archive'}
                  </button>
                  <button
                    onClick={() => toggleStar(selectedInsight.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: selectedInsight.isStarred ? 'rgba(251, 191, 36, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                      border: selectedInsight.isStarred ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
                      borderRadius: '8px',
                      color: selectedInsight.isStarred ? '#fbbf24' : '#94a3b8',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    {selectedInsight.isStarred ? '★ Starred' : '☆ Star'}
                  </button>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#f87171',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💡</div>
            <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Select an insight</h3>
            <p>Choose an insight from the list to view details</p>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && selectedInsight && (
        <ExportModal 
          insight={selectedInsight} 
          onClose={() => setShowExportModal(false)} 
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedInsight && (
        <EditModal 
          insight={selectedInsight} 
          projects={uniqueProjects}
          onSave={updateInsight}
          onClose={() => setShowEditModal(false)} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedInsight && (
        <DeleteConfirmModal
          insightTitle={selectedInsight.title}
          onConfirm={() => deleteInsight(selectedInsight.id)}
          onClose={() => setShowDeleteConfirm(false)}
        />
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ExportModal({ insight, onClose }: { insight: Insight; onClose: () => void }) {
  const exportOptions = [
    { id: 'pdf', icon: '📄', label: 'PDF Document', desc: 'Download as PDF file' },
    { id: 'markdown', icon: '📝', label: 'Markdown', desc: 'Download as .md file' },
    { id: 'word', icon: '📃', label: 'Word Document', desc: 'Download as .docx file' },
    { id: 'html', icon: '🌐', label: 'HTML', desc: 'Download as HTML file' },
    { id: 'clipboard', icon: '📋', label: 'Copy to Clipboard', desc: 'Copy content as text' },
    { id: 'notion', icon: '📓', label: 'Send to Notion', desc: 'Export to Notion page' },
  ];

  const handleExport = async (type: string) => {
    if (type === 'clipboard') {
      const text = `# ${insight.title}\n\n**Question:** ${insight.originalQuery}\n\n${insight.content}\n\n---\nSources:\n${insight.sources.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}`;
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
      onClose();
    } else if (type === 'markdown') {
      const text = `# ${insight.title}\n\n**Question:** ${insight.originalQuery}\n\n${insight.content}\n\n---\n## Sources\n${insight.sources.map((s, i) => `${i + 1}. ${s.title} (${s.relevance || 0}% match)`).join('\n')}`;
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${insight.title.replace(/[^a-z0-9]/gi, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } else {
      alert(`Export to ${type} coming soon!`);
    }
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
    }} onClick={onClose}>
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Export Insight</h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '1.25rem',
            cursor: 'pointer',
          }}>×</button>
        </div>

        <div style={{ padding: '1rem' }}>
          {exportOptions.map(option => (
            <button
              key={option.id}
              onClick={() => handleExport(option.id)}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '0.5rem',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{option.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: '#f1f5f9', fontWeight: 500 }}>{option.label}</div>
                <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>{option.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Edit Modal Component
function EditModal({ 
  insight, 
  projects,
  onSave, 
  onClose 
}: { 
  insight: Insight; 
  projects: { id?: string; name: string; color?: string }[];
  onSave: (updated: Insight) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(insight.title);
  const [content, setContent] = useState(insight.content);
  const [tagsInput, setTagsInput] = useState(insight.tags.join(', '));
  const [projectId, setProjectId] = useState(insight.projectId || '');

  const handleSave = () => {
    const selectedProject = projects.find(p => p.id === projectId);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    
    onSave({
      ...insight,
      title,
      content,
      tags,
      projectId: projectId || undefined,
      projectName: selectedProject?.name,
      projectColor: selectedProject?.color,
    });
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
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: '700px',
        maxHeight: '90vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>✏️ Edit Insight</h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '1.25rem',
            cursor: 'pointer',
          }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Title */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.8125rem', 
              color: '#94a3b8', 
              marginBottom: '0.5rem',
              fontWeight: 500,
            }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Project */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.8125rem', 
              color: '#94a3b8', 
              marginBottom: '0.5rem',
              fontWeight: 500,
            }}>
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">No Project (Inbox)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.8125rem', 
              color: '#94a3b8', 
              marginBottom: '0.5rem',
              fontWeight: 500,
            }}>
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="AI, Research, Notes"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Content */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.8125rem', 
              color: '#94a3b8', 
              marginBottom: '0.5rem',
              fontWeight: 500,
            }}>
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Original Query (read-only) */}
          <div style={{ 
            padding: '0.75rem 1rem', 
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '0.6875rem', color: '#8b5cf6', marginBottom: '0.25rem', fontWeight: 500 }}>
              ORIGINAL QUESTION (read-only)
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
              {insight.originalQuery}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(139, 92, 246, 0.15)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'rgba(100, 116, 139, 0.1)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '0.875rem',
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
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({ 
  insightTitle, 
  onConfirm, 
  onClose 
}: { 
  insightTitle: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
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
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '16px',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '1.5rem',
          textAlign: 'center',
        }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
          }}>
            🗑️
          </div>
          <h2 style={{ 
            fontSize: '1.125rem', 
            fontWeight: 600, 
            margin: '0 0 0.75rem 0',
            color: '#f1f5f9',
          }}>
            Delete Insight?
          </h2>
          <p style={{
            color: '#94a3b8',
            fontSize: '0.875rem',
            marginBottom: '0.5rem',
          }}>
            Are you sure you want to delete
          </p>
          <p style={{
            color: '#f1f5f9',
            fontSize: '0.9375rem',
            fontWeight: 500,
            marginBottom: '1.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '6px',
            display: 'inline-block',
          }}>
            &quot;{insightTitle}&quot;
          </p>
          <p style={{
            color: '#f87171',
            fontSize: '0.8125rem',
            marginBottom: '1.5rem',
          }}>
            This action cannot be undone.
          </p>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.625rem 1.5rem',
                background: 'rgba(100, 116, 139, 0.1)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '0.625rem 1.5rem',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
