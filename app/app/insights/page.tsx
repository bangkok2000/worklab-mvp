'use client';

import React, { useState } from 'react';

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
  shareLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 172800000),
  },
];

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>(demoInsights);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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

  const filteredInsights = insights.filter(insight => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = insight.title.toLowerCase().includes(query) ||
      insight.content.toLowerCase().includes(query) ||
      insight.originalQuery.toLowerCase().includes(query) ||
      (insight.projectName?.toLowerCase().includes(query) ?? false);
    const matchesTag = !filterTag || insight.tags.includes(filterTag);
    const matchesStarred = !showStarredOnly || insight.isStarred;
    const matchesProject = !filterProject || insight.projectId === filterProject;
    return matchesSearch && matchesTag && matchesStarred && matchesProject;
  });

  const toggleStar = (id: string) => {
    setInsights(prev => prev.map(i => 
      i.id === id ? { ...i, isStarred: !i.isStarred } : i
    ));
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
            <span style={{
              background: 'rgba(139, 92, 246, 0.15)',
              padding: '0.25rem 0.75rem',
              borderRadius: '10px',
              fontSize: '0.8125rem',
              color: '#c4b5fd',
            }}>
              {insights.length} saved
            </span>
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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                <button style={{
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
                }}>
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
