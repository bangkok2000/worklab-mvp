'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ContentType = 'all' | 'documents' | 'media' | 'web' | 'notes';
type ViewMode = 'grid' | 'list';

interface ContentItem {
  id: string;
  type: string;
  subtype: string;
  title: string;
  description?: string;
  thumbnail?: string;
  url?: string;
  addedAt: Date;
  size?: string;
  duration?: string;
  tags: string[];
  processed?: boolean;
  author?: string;
}

const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
  pdf: { icon: '📄', color: '#ef4444', label: 'PDF' },
  docx: { icon: '📝', color: '#3b82f6', label: 'Word' },
  google_doc: { icon: '📃', color: '#10b981', label: 'Google Doc' },
  google_slide: { icon: '📊', color: '#f59e0b', label: 'Slides' },
  youtube: { icon: '▶️', color: '#ef4444', label: 'YouTube' },
  youtube_short: { icon: '📱', color: '#ef4444', label: 'YouTube Short' },
  tiktok: { icon: '🎵', color: '#000000', label: 'TikTok' },
  vimeo: { icon: '🎬', color: '#1ab7ea', label: 'Vimeo' },
  podcast: { icon: '🎙️', color: '#8b5cf6', label: 'Podcast' },
  audio: { icon: '🔊', color: '#ec4899', label: 'Audio' },
  url: { icon: '🔗', color: '#6366f1', label: 'Website' },
  article: { icon: '📰', color: '#14b8a6', label: 'Article' },
  bookmark: { icon: '🔖', color: '#f59e0b', label: 'Bookmark' },
  note: { icon: '📝', color: '#8b5cf6', label: 'Note' },
  voice_note: { icon: '🎤', color: '#ec4899', label: 'Voice Note' },
};

export default function LibraryPage() {
  const router = useRouter();
  const [activeType, setActiveType] = useState<ContentType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);

  // Load content from localStorage (inbox + all projects)
  useEffect(() => {
    const loadContent = () => {
      const allContent: ContentItem[] = [];
      
      // Load from inbox
      const inbox = localStorage.getItem('moonscribe-inbox');
      if (inbox) {
        const inboxItems = JSON.parse(inbox);
        inboxItems.forEach((item: any) => {
          allContent.push(mapToContentItem(item));
        });
      }

      // Load from all projects
      const projects = localStorage.getItem('moonscribe-projects');
      if (projects) {
        const projectList = JSON.parse(projects);
        projectList.forEach((project: any) => {
          const projectContent = localStorage.getItem(`moonscribe-project-content-${project.id}`);
          if (projectContent) {
            const items = JSON.parse(projectContent);
            items.forEach((item: any) => {
              allContent.push(mapToContentItem(item));
            });
          }
        });
      }

      // Sort by date (newest first)
      allContent.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      setContent(allContent);
    };

    // Helper to map raw items to ContentItem format
    const mapToContentItem = (item: any): ContentItem => {
      const typeMapping: Record<string, { type: string; subtype: string }> = {
        youtube: { type: 'media', subtype: 'youtube' },
        tiktok: { type: 'media', subtype: 'tiktok' },
        podcast: { type: 'media', subtype: 'podcast' },
        audio: { type: 'media', subtype: 'audio' },
        image: { type: 'media', subtype: 'image' },
        video: { type: 'media', subtype: 'video' },
        article: { type: 'web', subtype: 'article' },
        url: { type: 'web', subtype: 'url' },
        note: { type: 'notes', subtype: 'note' },
        pdf: { type: 'documents', subtype: 'pdf' },
        document: { type: 'documents', subtype: 'document' },
      };

      const mapped = typeMapping[item.type] || { type: 'web', subtype: item.type || 'url' };

      return {
        id: item.id,
        type: mapped.type,
        subtype: mapped.subtype,
        title: item.title || 'Untitled',
        description: item.author || item.content?.substring(0, 100),
        thumbnail: item.thumbnail,
        url: item.url,
        addedAt: new Date(item.addedAt),
        duration: item.duration,
        tags: item.tags || [],
        processed: item.processed,
        author: item.author,
      };
    };

    loadContent();

    // Listen for new content
    const handleContentAdded = () => loadContent();
    window.addEventListener('moonscribe-content-added', handleContentAdded);
    return () => window.removeEventListener('moonscribe-content-added', handleContentAdded);
  }, []);

  const tabs: { id: ContentType; label: string; icon: string; count: number }[] = [
    { id: 'all', label: 'All Content', icon: '📚', count: content.length },
    { id: 'documents', label: 'Documents', icon: '📄', count: content.filter(c => c.type === 'documents').length },
    { id: 'media', label: 'Media', icon: '🎬', count: content.filter(c => c.type === 'media').length },
    { id: 'web', label: 'Web', icon: '🌐', count: content.filter(c => c.type === 'web').length },
    { id: 'notes', label: 'Notes', icon: '📝', count: content.filter(c => c.type === 'notes').length },
  ];

  const filteredContent = content.filter(item => {
    const matchesType = activeType === 'all' || item.type === activeType;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Library</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>All your content in one place</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={{
            padding: '0.625rem 1rem',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '8px',
            color: '#c4b5fd',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            📥 Import
          </button>
          <button style={{
            padding: '0.625rem 1rem',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
          }}>
            + Add Content
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
        paddingBottom: '0.75rem',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveType(tab.id)}
            style={{
              padding: '0.625rem 1rem',
              background: activeType === tab.id ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeType === tab.id ? '#c4b5fd' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
            <span style={{
              background: activeType === tab.id ? 'rgba(139, 92, 246, 0.3)' : 'rgba(100, 116, 139, 0.2)',
              padding: '0.125rem 0.5rem',
              borderRadius: '10px',
              fontSize: '0.75rem',
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters & Search */}
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
            placeholder="Search content..."
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
          {/* View Mode Toggle */}
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

          {/* Sort */}
          <select style={{
            padding: '0.5rem 1rem',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '8px',
            color: '#94a3b8',
            fontSize: '0.875rem',
            outline: 'none',
            cursor: 'pointer',
          }}>
            <option>Recently Added</option>
            <option>Alphabetical</option>
            <option>Type</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(139, 92, 246, 0.15)',
          borderRadius: '10px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: '#c4b5fd', fontSize: '0.875rem' }}>
            {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '6px',
              color: '#c4b5fd',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}>
              Add to Project
            </button>
            <button style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '6px',
              color: '#c4b5fd',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}>
              Tag
            </button>
            <button style={{
              padding: '0.5rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Content Grid/List */}
      {viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {filteredContent.map(item => (
            <ContentCard 
              key={item.id} 
              item={item} 
              isSelected={selectedItems.includes(item.id)}
              onSelect={() => toggleSelect(item.id)}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredContent.map(item => (
            <ContentListItem
              key={item.id}
              item={item}
              isSelected={selectedItems.includes(item.id)}
              onSelect={() => toggleSelect(item.id)}
            />
          ))}
        </div>
      )}

      {filteredContent.length === 0 && (
        <div style={{
          padding: '4rem',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {content.length === 0 ? '📚' : '🔍'}
          </div>
          <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>
            {content.length === 0 ? 'Your Library is Empty' : 'No content found'}
          </h3>
          <p style={{ marginBottom: '1.5rem' }}>
            {content.length === 0 
              ? 'Add YouTube videos, documents, or web pages to get started'
              : 'Try adjusting your filters or search query'}
          </p>
          {content.length === 0 && (
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                padding: '1rem 1.5rem',
                textAlign: 'left',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🎬</div>
                <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: 500 }}>YouTube</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Transcripts indexed</div>
              </div>
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '10px',
                padding: '1rem 1.5rem',
                textAlign: 'left',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📄</div>
                <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: 500 }}>PDFs</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Coming soon</div>
              </div>
              <div style={{
                background: 'rgba(20, 184, 166, 0.1)',
                border: '1px solid rgba(20, 184, 166, 0.2)',
                borderRadius: '10px',
                padding: '1rem 1.5rem',
                textAlign: 'left',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🌐</div>
                <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: 500 }}>Web Pages</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Coming soon</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContentCard({ item, isSelected, onSelect }: { item: ContentItem; isSelected: boolean; onSelect: () => void }) {
  const config = typeConfig[item.subtype] || { icon: '📄', color: '#8b5cf6', label: item.subtype };
  const hasThumbnail = item.thumbnail && (item.subtype === 'youtube' || item.subtype === 'article');
  const isVideo = item.subtype === 'youtube' || item.subtype === 'tiktok' || item.subtype === 'vimeo';
  
  const handleClick = () => {
    // For content with URLs, open in new tab
    if (item.url) {
      window.open(item.url, '_blank');
    }
  };
  
  return (
    <div 
      onClick={handleClick}
      style={{
        background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(15, 15, 35, 0.6)',
        border: isSelected ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(139, 92, 246, 0.15)',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {/* Thumbnail/Preview */}
      <div style={{
        height: '120px',
        background: hasThumbnail ? 'transparent' : `${config.color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundImage: hasThumbnail ? `url(${item.thumbnail})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        {!hasThumbnail && <span style={{ fontSize: '3rem', opacity: 0.8 }}>{config.icon}</span>}
        
        {/* Play button overlay for videos */}
        {hasThumbnail && isVideo && (
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

        {/* Link icon overlay for articles */}
        {hasThumbnail && !isVideo && (
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            left: '0.5rem',
            width: '32px',
            height: '32px',
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1rem' }}>🔗</span>
          </div>
        )}
        
        {/* Select Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: isSelected ? '#8b5cf6' : 'rgba(0, 0, 0, 0.5)',
            border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.75rem',
          }}
        >
          {isSelected && '✓'}
        </button>

        {/* Processed badge */}
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

        {/* Duration badge for media */}
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
      </div>

      {/* Info */}
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{
            background: `${config.color}20`,
            color: config.color,
            padding: '0.125rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.6875rem',
            fontWeight: 500,
          }}>
            {config.label}
          </span>
          {item.size && (
            <span style={{ color: '#64748b', fontSize: '0.6875rem' }}>{item.size}</span>
          )}
        </div>
        
        <h3 style={{
          fontSize: '0.9375rem',
          fontWeight: 500,
          color: '#f1f5f9',
          marginBottom: '0.25rem',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {item.title}
        </h3>
        
        {item.description && (
          <p style={{
            fontSize: '0.8125rem',
            color: '#64748b',
            marginBottom: '0.75rem',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {item.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {item.tags.map(tag => (
            <span key={tag} style={{
              background: 'rgba(139, 92, 246, 0.1)',
              color: '#a78bfa',
              padding: '0.125rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.6875rem',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentListItem({ item, isSelected, onSelect }: { item: ContentItem; isSelected: boolean; onSelect: () => void }) {
  const config = typeConfig[item.subtype] || { icon: '📄', color: '#8b5cf6', label: item.subtype };

  return (
    <div style={{
      padding: '1rem',
      background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(15, 15, 35, 0.6)',
      border: isSelected ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(139, 92, 246, 0.15)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      cursor: 'pointer',
    }}>
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          background: isSelected ? '#8b5cf6' : 'transparent',
          border: isSelected ? 'none' : '2px solid rgba(139, 92, 246, 0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '0.6875rem',
          flexShrink: 0,
        }}
      >
        {isSelected && '✓'}
      </button>

      {/* Icon */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        background: `${config.color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem',
        flexShrink: 0,
      }}>
        {config.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{
          fontSize: '0.9375rem',
          fontWeight: 500,
          color: '#f1f5f9',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {item.title}
        </h3>
        <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          {config.label} {item.duration && `• ${item.duration}`} {item.size && `• ${item.size}`}
        </p>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        {item.tags.slice(0, 2).map(tag => (
          <span key={tag} style={{
            background: 'rgba(139, 92, 246, 0.1)',
            color: '#a78bfa',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.6875rem',
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button style={{
          padding: '0.375rem 0.625rem',
          background: 'transparent',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '6px',
          color: '#94a3b8',
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}>
          ⋯
        </button>
      </div>
    </div>
  );
}
