'use client';

import React, { useState, useEffect } from 'react';

interface WebItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  domain?: string;
  favicon?: string;
  thumbnail?: string;
  author?: string;
  addedAt: string;
  processed?: boolean;
}

export default function WebArticlesPage() {
  const [articles, setArticles] = useState<WebItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadArticles = () => {
      const allArticles: WebItem[] = [];
      
      // Load from inbox
      const inbox = localStorage.getItem('moonscribe-inbox');
      if (inbox) {
        const items = JSON.parse(inbox);
        items.forEach((item: any) => {
          if (['article', 'url', 'bookmark', 'web'].includes(item.type)) {
            allArticles.push({
              id: item.id,
              title: item.title || 'Untitled Article',
              description: item.description,
              url: item.url,
              domain: item.domain,
              favicon: item.favicon,
              thumbnail: item.thumbnail,
              author: item.author,
              addedAt: item.addedAt,
              processed: item.processed,
            });
          }
        });
      }

      // Load from projects
      const projects = localStorage.getItem('moonscribe-projects');
      if (projects) {
        const projectList = JSON.parse(projects);
        projectList.forEach((project: any) => {
          const content = localStorage.getItem(`moonscribe-project-content-${project.id}`);
          if (content) {
            const items = JSON.parse(content);
            items.forEach((item: any) => {
              if (['article', 'url', 'bookmark', 'web'].includes(item.type)) {
                allArticles.push({
                  id: item.id,
                  title: item.title || 'Untitled Article',
                  description: item.description,
                  url: item.url,
                  domain: item.domain,
                  favicon: item.favicon,
                  thumbnail: item.thumbnail,
                  author: item.author,
                  addedAt: item.addedAt,
                  processed: item.processed,
                });
              }
            });
          }
        });
      }

      allArticles.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      setArticles(allArticles);
    };

    loadArticles();
    window.addEventListener('moonscribe-content-added', loadArticles);
    return () => window.removeEventListener('moonscribe-content-added', loadArticles);
  }, []);

  const filteredArticles = articles.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          🌐 Web & Articles
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          Saved web pages, articles, and bookmarks
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.75rem 1rem',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '8px',
            color: '#f1f5f9',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
      </div>

      {/* Articles List */}
      {filteredArticles.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredArticles.map(item => (
            <div
              key={item.id}
              onClick={() => item.url && window.open(item.url, '_blank')}
              style={{
                padding: '1rem',
                background: 'rgba(15, 15, 35, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: item.url ? 'pointer' : 'default',
              }}
            >
              {/* Thumbnail or Icon */}
              <div style={{
                width: '80px',
                height: '60px',
                background: item.thumbnail ? `url(${item.thumbnail})` : 'rgba(20, 184, 166, 0.1)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {!item.thumbnail && <span style={{ fontSize: '1.5rem' }}>🌐</span>}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  {item.favicon && (
                    <img 
                      src={item.favicon} 
                      alt="" 
                      style={{ width: '16px', height: '16px', borderRadius: '2px' }}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {item.domain || 'Web'}
                  </span>
                </div>
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
                {item.description && (
                  <p style={{
                    fontSize: '0.8125rem',
                    color: '#64748b',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {item.description}
                  </p>
                )}
              </div>

              {/* Status */}
              {item.processed && (
                <span style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  flexShrink: 0,
                }}>
                  ✓ Indexed
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '4rem',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌐</div>
          <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No web articles yet</h3>
          <p>Add web page URLs to capture and search their content</p>
        </div>
      )}
    </div>
  );
}
