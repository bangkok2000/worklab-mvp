'use client';

import React, { useState, useEffect } from 'react';

interface DocumentItem {
  id: string;
  title: string;
  type: string;
  size?: string;
  pages?: number;
  addedAt: string;
  processed?: boolean;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load documents from localStorage
    const loadDocuments = () => {
      const allDocs: DocumentItem[] = [];
      
      // Load from inbox
      const inbox = localStorage.getItem('moonscribe-inbox');
      if (inbox) {
        const items = JSON.parse(inbox);
        items.forEach((item: any) => {
          if (item.type === 'pdf' || item.type === 'docx' || item.type === 'document') {
            allDocs.push({
              id: item.id,
              title: item.title || 'Untitled Document',
              type: item.type,
              size: item.size,
              pages: item.pages,
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
              if (item.type === 'pdf' || item.type === 'docx' || item.type === 'document') {
                allDocs.push({
                  id: item.id,
                  title: item.title || 'Untitled Document',
                  type: item.type,
                  size: item.size,
                  pages: item.pages,
                  addedAt: item.addedAt,
                  processed: item.processed,
                });
              }
            });
          }
        });
      }

      allDocs.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      setDocuments(allDocs);
    };

    loadDocuments();
    window.addEventListener('moonscribe-content-added', loadDocuments);
    return () => window.removeEventListener('moonscribe-content-added', loadDocuments);
  }, []);

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          📄 Documents
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          PDFs, Word documents, and other files
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search documents..."
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

      {/* Documents List */}
      {filteredDocs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              style={{
                padding: '1rem',
                background: 'rgba(15, 15, 35, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}>
                📄
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#f1f5f9' }}>
                  {doc.title}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  {doc.type.toUpperCase()} {doc.size && `• ${doc.size}`} {doc.pages && `• ${doc.pages} pages`}
                </p>
              </div>
              {doc.processed && (
                <span style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
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
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No documents yet</h3>
          <p>Upload PDFs or Word documents to get started</p>
        </div>
      )}
    </div>
  );
}
