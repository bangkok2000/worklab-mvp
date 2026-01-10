'use client';

import React, { useState, useEffect } from 'react';

interface MediaItem {
  id: string;
  title: string;
  type: string;
  thumbnail?: string;
  url?: string;
  duration?: string;
  author?: string;
  addedAt: string;
  processed?: boolean;
}

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadMedia = () => {
      const allMedia: MediaItem[] = [];
      
      // Load from inbox
      const inbox = localStorage.getItem('moonscribe-inbox');
      if (inbox) {
        const items = JSON.parse(inbox);
        items.forEach((item: any) => {
          if (['youtube', 'tiktok', 'podcast', 'audio', 'video', 'image'].includes(item.type)) {
            allMedia.push({
              id: item.id,
              title: item.title || 'Untitled Media',
              type: item.type,
              thumbnail: item.thumbnail,
              url: item.url,
              duration: item.duration,
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
              if (['youtube', 'tiktok', 'podcast', 'audio', 'video'].includes(item.type)) {
                allMedia.push({
                  id: item.id,
                  title: item.title || 'Untitled Media',
                  type: item.type,
                  thumbnail: item.thumbnail,
                  url: item.url,
                  duration: item.duration,
                  author: item.author,
                  addedAt: item.addedAt,
                  processed: item.processed,
                });
              }
            });
          }
        });
      }

      allMedia.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      setMedia(allMedia);
    };

    loadMedia();
    window.addEventListener('moonscribe-content-added', loadMedia);
    return () => window.removeEventListener('moonscribe-content-added', loadMedia);
  }, []);

  const filteredMedia = media.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typeIcons: Record<string, string> = {
    youtube: '▶️',
    tiktok: '🎵',
    podcast: '🎙️',
    audio: '🔊',
    video: '🎬',
    image: '🖼️',
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          🎬 Media
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          YouTube videos, podcasts, and audio files
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search media..."
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

      {/* Media Grid */}
      {filteredMedia.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {filteredMedia.map(item => (
            <div
              key={item.id}
              onClick={() => item.url && window.open(item.url, '_blank')}
              style={{
                background: 'rgba(15, 15, 35, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: item.url ? 'pointer' : 'default',
              }}
            >
              {/* Thumbnail */}
              <div style={{
                height: '160px',
                background: item.thumbnail ? `url(${item.thumbnail})` : 'rgba(239, 68, 68, 0.1)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                {!item.thumbnail && (
                  <span style={{ fontSize: '3rem' }}>{typeIcons[item.type] || '🎬'}</span>
                )}
                {item.thumbnail && (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '1.5rem', marginLeft: '3px' }}>▶</span>
                  </div>
                )}
                {item.duration && (
                  <span style={{
                    position: 'absolute',
                    bottom: '0.5rem',
                    right: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.8)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: 'white',
                  }}>
                    {item.duration}
                  </span>
                )}
                {item.processed && (
                  <span style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: 'rgba(34, 197, 94, 0.9)',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.625rem',
                    color: 'white',
                    fontWeight: 500,
                  }}>
                    ✓ Indexed
                  </span>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '1rem' }}>
                <span style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}>
                  {item.type}
                </span>
                <h3 style={{
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: '#f1f5f9',
                  marginTop: '0.5rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {item.title}
                </h3>
                {item.author && (
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                    {item.author}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '4rem',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
          <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No media yet</h3>
          <p>Add YouTube videos or audio files to get started</p>
        </div>
      )}
    </div>
  );
}
