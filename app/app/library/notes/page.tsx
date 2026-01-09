'use client';

import React, { useState, useEffect } from 'react';

interface NoteItem {
  id: string;
  title: string;
  content?: string;
  addedAt: string;
  updatedAt?: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  useEffect(() => {
    const loadNotes = () => {
      const allNotes: NoteItem[] = [];
      
      // Load from inbox
      const inbox = localStorage.getItem('moonscribe-inbox');
      if (inbox) {
        const items = JSON.parse(inbox);
        items.forEach((item: any) => {
          if (item.type === 'note') {
            allNotes.push({
              id: item.id,
              title: item.title || 'Untitled Note',
              content: item.content,
              addedAt: item.addedAt,
              updatedAt: item.updatedAt,
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
              if (item.type === 'note') {
                allNotes.push({
                  id: item.id,
                  title: item.title || 'Untitled Note',
                  content: item.content,
                  addedAt: item.addedAt,
                  updatedAt: item.updatedAt,
                });
              }
            });
          }
        });
      }

      allNotes.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      setNotes(allNotes);
    };

    loadNotes();
    window.addEventListener('moonscribe-content-added', loadNotes);
    return () => window.removeEventListener('moonscribe-content-added', loadNotes);
  }, []);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          📝 Notes
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          Quick notes and captured thoughts
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search notes..."
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

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              style={{
                padding: '1rem',
                background: 'rgba(15, 15, 35, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <h3 style={{
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: '#f1f5f9',
                marginBottom: '0.5rem',
              }}>
                {note.title}
              </h3>
              {note.content && (
                <p style={{
                  fontSize: '0.8125rem',
                  color: '#94a3b8',
                  marginBottom: '0.75rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                }}>
                  {note.content}
                </p>
              )}
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {formatDate(note.addedAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '4rem',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No notes yet</h3>
          <p>Create a quick note to capture your thoughts</p>
        </div>
      )}

      {/* Note Detail Modal */}
      {selectedNote && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem',
          }}
          onClick={() => setSelectedNote(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{selectedNote.title}</h2>
              <button
                onClick={() => setSelectedNote(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflow: 'auto', maxHeight: 'calc(80vh - 80px)' }}>
              <p style={{
                color: '#e2e8f0',
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}>
                {selectedNote.content || 'No content'}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1.5rem' }}>
                Created: {formatDate(selectedNote.addedAt)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
