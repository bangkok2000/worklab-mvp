'use client';

import React, { useState } from 'react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'import' | 'export' | 'ai';
  status: 'connected' | 'available' | 'coming_soon';
  connectedAt?: Date;
}

const integrations: Integration[] = [
  // Import Sources
  { id: 'google_drive', name: 'Google Drive', description: 'Import docs, slides, and files from Google Drive', icon: '📁', category: 'import', status: 'available' },
  { id: 'dropbox', name: 'Dropbox', description: 'Sync files from your Dropbox account', icon: '📦', category: 'import', status: 'available' },
  { id: 'pocket', name: 'Pocket', description: 'Import saved articles from Pocket', icon: '👝', category: 'import', status: 'available' },
  { id: 'instapaper', name: 'Instapaper', description: 'Import saved articles from Instapaper', icon: '📰', category: 'import', status: 'coming_soon' },
  { id: 'readwise', name: 'Readwise', description: 'Sync highlights and notes', icon: '📚', category: 'import', status: 'coming_soon' },
  { id: 'chrome', name: 'Chrome Extension', description: 'Capture web pages directly from your browser', icon: '🌐', category: 'import', status: 'available' },
  { id: 'youtube', name: 'YouTube', description: 'Import video transcripts automatically', icon: '▶️', category: 'import', status: 'connected', connectedAt: new Date(Date.now() - 7 * 86400000) },
  
  // Export Destinations
  { id: 'notion', name: 'Notion', description: 'Export insights and notes to Notion', icon: '📓', category: 'export', status: 'available' },
  { id: 'obsidian', name: 'Obsidian', description: 'Export notes in Markdown format', icon: '🔮', category: 'export', status: 'available' },
  { id: 'roam', name: 'Roam Research', description: 'Export to Roam Research', icon: '🧠', category: 'export', status: 'coming_soon' },
  { id: 'evernote', name: 'Evernote', description: 'Export notes to Evernote', icon: '🐘', category: 'export', status: 'coming_soon' },
  
  // AI Providers
  { id: 'openai', name: 'OpenAI', description: 'GPT-4, GPT-3.5 for chat and embeddings', icon: '🤖', category: 'ai', status: 'connected', connectedAt: new Date(Date.now() - 14 * 86400000) },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude 3 for advanced reasoning', icon: '🧪', category: 'ai', status: 'available' },
  { id: 'google_ai', name: 'Google AI', description: 'Gemini models', icon: '🔷', category: 'ai', status: 'available' },
  { id: 'ollama', name: 'Ollama', description: 'Run local models on your machine', icon: '🦙', category: 'ai', status: 'available' },
];

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'import' | 'export' | 'ai'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'All Integrations', icon: '🔌' },
    { id: 'import', label: 'Import Sources', icon: '📥' },
    { id: 'export', label: 'Export Destinations', icon: '📤' },
    { id: 'ai', label: 'AI Providers', icon: '🤖' },
  ];

  const filteredIntegrations = integrations.filter(int => {
    const matchesCategory = activeCategory === 'all' || int.category === activeCategory;
    const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>🔌 Integrations</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          Connect your favorite tools and services • {connectedCount} connected
        </p>
      </div>

      {/* Categories */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as typeof activeCategory)}
            style={{
              padding: '0.625rem 1rem',
              background: activeCategory === cat.id ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0, 0, 0, 0.2)',
              border: activeCategory === cat.id ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '8px',
              color: activeCategory === cat.id ? '#c4b5fd' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem', maxWidth: '400px', position: 'relative' }}>
        <input
          type="text"
          placeholder="Search integrations..."
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

      {/* Integrations Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1rem',
      }}>
        {filteredIntegrations.map(integration => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div style={{
          padding: '4rem',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No integrations found</h3>
          <p>Try a different search or category</p>
        </div>
      )}

      {/* Request Integration */}
      <div style={{
        marginTop: '3rem',
        padding: '2rem',
        background: 'rgba(139, 92, 246, 0.08)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '16px',
        textAlign: 'center',
      }}>
        <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Missing an integration?</h3>
        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
          Let us know what tools you'd like to connect with MoonScribe
        </p>
        <button style={{
          padding: '0.75rem 1.5rem',
          background: 'rgba(139, 92, 246, 0.2)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '8px',
          color: '#c4b5fd',
          fontWeight: 500,
          cursor: 'pointer',
        }}>
          Request Integration
        </button>
      </div>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const statusStyles = {
    connected: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', text: 'Connected' },
    available: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', text: 'Available' },
    coming_soon: { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', text: 'Coming Soon' },
  };

  const status = statusStyles[integration.status];

  return (
    <div style={{
      padding: '1.5rem',
      background: 'rgba(15, 15, 35, 0.6)',
      border: integration.status === 'connected' 
        ? '1px solid rgba(16, 185, 129, 0.3)' 
        : '1px solid rgba(139, 92, 246, 0.15)',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '12px',
          background: 'rgba(139, 92, 246, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          flexShrink: 0,
        }}>
          {integration.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h3 style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {integration.name}
            </h3>
            <span style={{
              padding: '0.125rem 0.5rem',
              background: status.bg,
              color: status.color,
              borderRadius: '4px',
              fontSize: '0.6875rem',
            }}>
              {status.text}
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: 0 }}>
            {integration.description}
          </p>
        </div>
      </div>

      {integration.status === 'connected' ? (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={{
            flex: 1,
            padding: '0.625rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            color: '#34d399',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}>
            ⚙️ Settings
          </button>
          <button style={{
            padding: '0.625rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}>
            Disconnect
          </button>
        </div>
      ) : integration.status === 'available' ? (
        <button style={{
          padding: '0.625rem',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontWeight: 500,
          cursor: 'pointer',
        }}>
          Connect
        </button>
      ) : (
        <button style={{
          padding: '0.625rem',
          background: 'rgba(100, 116, 139, 0.1)',
          border: '1px solid rgba(100, 116, 139, 0.2)',
          borderRadius: '8px',
          color: '#64748b',
          cursor: 'not-allowed',
        }} disabled>
          Coming Soon
        </button>
      )}

      {integration.connectedAt && (
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem', textAlign: 'center' }}>
          Connected {formatRelativeDate(integration.connectedAt)}
        </p>
      )}
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
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return date.toLocaleDateString();
}
