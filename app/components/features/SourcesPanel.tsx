'use client';

import React, { useState, useRef } from 'react';
import { Input, Button, Badge, EmptyState, Card } from '../ui';

interface Document {
  id: string;
  name: string;
  status: 'ready' | 'processing' | 'error';
  chunks?: number;
  uploadedAt?: Date;
  type?: string; // Content type: 'document', 'youtube', 'article', 'note', etc.
  url?: string;
  thumbnail?: string;
}

interface SourcesPanelProps {
  documents: Document[];
  onUpload: (files: File[]) => void;
  onDelete: (id: string) => void;
  isUploading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onAddContent?: () => void; // Callback to open Add Content modal
  projectId?: string; // Current project ID for context
}

export default function SourcesPanel({
  documents,
  onUpload,
  onDelete,
  isUploading = false,
  searchQuery = '',
  onSearchChange,
  onAddContent,
  projectId,
}: SourcesPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type === 'application/pdf'
      );
      if (files.length > 0) {
        onUpload(files);
      }
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
        <Input
          placeholder="Search sources..."
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          }
        />
      </div>

      {/* Add Content Button */}
      {onAddContent && (
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
          <button
            onClick={() => {
              // Trigger FAB click to open Add Content modal (which will auto-detect project from URL)
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('moonscribe-open-add-content'));
              }
              // Also call callback in case project page has its own handler
              onAddContent();
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>+</span>
            <span>Add Content (YouTube, Web, Notes, Images)</span>
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf,image/*,.jpg,.jpeg,.png,.gif,.webp,audio/*,.mp3,.wav,.m4a"
          multiple
          onChange={(e) => {
            if (e.target.files) {
              onUpload(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
          style={{ display: 'none' }}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            padding: '1.5rem',
            border: `2px dashed ${dragActive ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.3)'}`,
            borderRadius: '12px',
            background: dragActive ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {isUploading ? '⏳' : '📄'}
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#8b5cf6', margin: 0 }}>
            {isUploading ? 'Processing...' : 'Drop files here or click to upload'}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Supports PDF, Images, Audio (MP3, WAV, M4A) up to 100MB
          </p>
        </div>
      </div>

      {/* Documents List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {filteredDocuments.length === 0 ? (
          <EmptyState
            icon="📄"
            title={searchQuery ? 'No sources found' : 'No sources yet'}
            description={searchQuery ? 'Try a different search term' : 'Add PDFs, YouTube videos, web pages, or notes to get started'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredDocuments.map((doc) => (
              <DocumentCard key={doc.id} document={doc} onDelete={() => onDelete(doc.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      {documents.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid rgba(139, 92, 246, 0.15)',
            fontSize: '0.75rem',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{documents.length} source{documents.length !== 1 ? 's' : ''}</span>
          <span>{documents.filter((d) => d.status === 'ready').length} ready</span>
        </div>
      )}
    </div>
  );
}

// Document Card sub-component
function DocumentCard({ document, onDelete }: { document: Document; onDelete: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  const statusConfig = {
    ready: { badge: 'success' as const, label: 'Ready' },
    processing: { badge: 'warning' as const, label: 'Processing' },
    error: { badge: 'error' as const, label: 'Error' },
  };

  const { badge, label } = statusConfig[document.status];

  // Get icon based on content type
  const getIcon = () => {
    const type = document.type?.toLowerCase() || 'document';
    if (type === 'youtube' || type === 'video') return '🎬';
    if (type === 'article' || type === 'url' || type === 'web') return '🌐';
    if (type === 'note') return '📝';
    if (type === 'image' || type === 'photo') return '🖼️';
    return '📄'; // Default to document icon
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '0.875rem 1rem',
        background: isHovered ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.06)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        borderRadius: '10px',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
            <span style={{ fontSize: '1rem' }}>{getIcon()}</span>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#f1f5f9',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {document.name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Badge variant={badge} size="sm" dot>
              {label}
            </Badge>
            {document.chunks && (
              <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                {document.chunks} chunks
              </span>
            )}
            {document.type && document.type !== 'document' && (
              <span style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'capitalize' }}>
                {document.type}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            padding: '0.375rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: '1rem',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s',
            borderRadius: '6px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
        >
          ×
        </button>
      </div>
    </div>
  );
}
