'use client';

import React, { useState, useEffect } from 'react';
import { EmptyState, Button, Badge, Input } from '../ui';

interface Insight {
  id: string;
  title: string;
  originalQuery: string;
  content: string;
  sources: { id: string; title: string; type: string; relevance?: number }[];
  tags: string[];
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  isStarred: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface InsightsPanelProps {
  projectId: string;
  onSelectInsight?: (insight: Insight) => void;
  onDeleteInsight?: (id: string) => void;
}

export default function InsightsPanel({
  projectId,
  onSelectInsight,
  onDeleteInsight,
}: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load insights for this project
  useEffect(() => {
    if (!isMounted || !projectId) return;

    const loadInsights = () => {
      try {
        const STORAGE_KEY = 'moonscribe_insights_v2';
        const saved = localStorage.getItem(STORAGE_KEY);
        
        if (saved) {
          const data = JSON.parse(saved);
          if (data.insights) {
            // Filter insights for this project and not archived
            // Deduplicate: Remove insights with identical content
            const projectInsights = data.insights
              .filter((i: any) => 
                i.projectId === projectId && !i.isArchived
              )
              .map((i: any) => ({
                ...i,
                createdAt: new Date(i.createdAt),
                updatedAt: new Date(i.updatedAt),
              }))
              // Deduplicate by content (normalized)
              .filter((insight: Insight, index: number, self: Insight[]) => {
                const contentNormalized = insight.content.trim().toLowerCase();
                return index === self.findIndex((i: Insight) => 
                  i.content.trim().toLowerCase() === contentNormalized
                );
              })
              .sort((a: Insight, b: Insight) => 
                b.createdAt.getTime() - a.createdAt.getTime()
              );
            
            setInsights(projectInsights);
          }
        }
      } catch (error) {
        console.error('Failed to load insights:', error);
      }
    };

    loadInsights();

    // Listen for insight changes
    const handleInsightChange = () => {
      loadInsights();
    };
    window.addEventListener('moonscribe-insights-changed', handleInsightChange);
    window.addEventListener('storage', handleInsightChange);

    return () => {
      window.removeEventListener('moonscribe-insights-changed', handleInsightChange);
      window.removeEventListener('storage', handleInsightChange);
    };
  }, [isMounted, projectId]);

  const filteredInsights = insights.filter((insight) =>
    insight.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insight.originalQuery.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insight.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days === 0) {
      if (minutes < 1) return 'Just now';
      if (hours < 1) return `${minutes}m ago`;
      return `Today ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    }
    if (days === 1) return `Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const handleDelete = (e: React.MouseEvent, insightId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this insight?')) {
      try {
        const STORAGE_KEY = 'moonscribe_insights_v2';
        const saved = localStorage.getItem(STORAGE_KEY);
        
        if (saved) {
          const data = JSON.parse(saved);
          if (data.insights) {
            const updated = data.insights.filter((i: any) => i.id !== insightId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              ...data,
              insights: updated,
            }));
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('moonscribe-insights-changed', {
              detail: { count: updated.filter((i: any) => !i.isArchived).length }
            }));
            
            if (onDeleteInsight) {
              onDeleteInsight(insightId);
            }
          }
        }
      } catch (error) {
        console.error('Failed to delete insight:', error);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
          }}
        >
          💡
        </span>
        <h3 style={{ 
          fontSize: '0.9375rem', 
          fontWeight: 600, 
          color: '#f1f5f9',
          margin: 0,
          flex: 1,
        }}>
          Insights
        </h3>
        <Badge variant="secondary" style={{ fontSize: '0.75rem' }}>
          {insights.length}
        </Badge>
      </div>

      {/* Search */}
      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}>
        <Input
          placeholder="Search insights..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
        />
      </div>

      {/* Insights List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        padding: '0.5rem',
      }}>
        {filteredInsights.length === 0 ? (
          <EmptyState
            icon="💡"
            title={searchQuery ? "No insights found" : "No insights yet"}
            description={searchQuery 
              ? "Try a different search term" 
              : "Save AI responses as insights to see them here"}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredInsights.map((insight) => (
              <div
                key={insight.id}
                onClick={() => onSelectInsight?.(insight)}
                style={{
                  padding: '0.875rem',
                  background: 'rgba(15, 15, 35, 0.6)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(15, 15, 35, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.15)';
                }}
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, insight.id)}
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    opacity: 0.6,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#f87171';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.opacity = '0.6';
                  }}
                  title="Delete insight"
                >
                  ✕
                </button>

                {/* Title */}
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#f1f5f9',
                  margin: '0 0 0.375rem 0',
                  paddingRight: '1.5rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {insight.isStarred && <span style={{ marginRight: '0.25rem' }}>⭐</span>}
                  {insight.title}
                </h4>

                {/* Question */}
                <p style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  margin: '0 0 0.5rem 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  Q: {insight.originalQuery}
                </p>

                {/* Tags */}
                {insight.tags.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.375rem', 
                    flexWrap: 'wrap',
                    marginBottom: '0.5rem',
                  }}>
                    {insight.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.5rem',
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#a78bfa',
                          borderRadius: '4px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {insight.tags.length > 3 && (
                      <span style={{
                        fontSize: '0.6875rem',
                        color: '#64748b',
                      }}>
                        +{insight.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.6875rem',
                  color: '#64748b',
                }}>
                  <span>📄 {insight.sources.length} source{insight.sources.length !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{formatDate(insight.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
