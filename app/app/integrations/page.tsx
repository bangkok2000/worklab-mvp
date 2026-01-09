'use client';

import React, { useState, useEffect } from 'react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'import' | 'export' | 'ai';
  status: 'connected' | 'available' | 'coming_soon';
  connectedAt?: string;
  settings?: Record<string, any>;
}

const AVAILABLE_INTEGRATIONS: Omit<Integration, 'status' | 'connectedAt' | 'settings'>[] = [
  // Import Sources
  { id: 'google_drive', name: 'Google Drive', description: 'Import docs, slides, and files from Google Drive', icon: '📁', category: 'import' },
  { id: 'dropbox', name: 'Dropbox', description: 'Sync files from your Dropbox account', icon: '📦', category: 'import' },
  { id: 'pocket', name: 'Pocket', description: 'Import saved articles from Pocket', icon: '👝', category: 'import' },
  { id: 'chrome', name: 'Chrome Extension', description: 'Capture web pages directly from your browser', icon: '🌐', category: 'import' },
  { id: 'youtube', name: 'YouTube', description: 'Import video transcripts automatically', icon: '▶️', category: 'import' },
  
  // Export Destinations
  { id: 'notion', name: 'Notion', description: 'Export insights and notes to Notion', icon: '📓', category: 'export' },
  { id: 'obsidian', name: 'Obsidian', description: 'Export notes in Markdown format', icon: '🔮', category: 'export' },
  
  // AI Providers
  { id: 'openai', name: 'OpenAI', description: 'GPT-4, GPT-3.5 for chat and embeddings', icon: '🤖', category: 'ai' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude 3 for advanced reasoning', icon: '🧪', category: 'ai' },
  { id: 'google_ai', name: 'Google AI', description: 'Gemini models', icon: '🔷', category: 'ai' },
  { id: 'ollama', name: 'Ollama', description: 'Run local models on your machine', icon: '🦙', category: 'ai' },
];

const COMING_SOON = ['instapaper', 'readwise', 'roam', 'evernote'];

const STORAGE_KEY = 'moonscribe-integrations';

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'import' | 'export' | 'ai'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectedIntegrations, setConnectedIntegrations] = useState<Record<string, { connectedAt: string; settings?: Record<string, any> }>>({});
  const [showConnectModal, setShowConnectModal] = useState<Integration | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<Integration | null>(null);

  // Load connected integrations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setConnectedIntegrations(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage
  const saveConnections = (connections: typeof connectedIntegrations) => {
    setConnectedIntegrations(connections);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
  };

  // Connect an integration
  const connectIntegration = (id: string, settings?: Record<string, any>) => {
    const updated = {
      ...connectedIntegrations,
      [id]: {
        connectedAt: new Date().toISOString(),
        settings,
      },
    };
    saveConnections(updated);
    setShowConnectModal(null);
  };

  // Disconnect an integration
  const disconnectIntegration = (id: string) => {
    const updated = { ...connectedIntegrations };
    delete updated[id];
    saveConnections(updated);
  };

  // Update integration settings
  const updateSettings = (id: string, settings: Record<string, any>) => {
    const updated = {
      ...connectedIntegrations,
      [id]: {
        ...connectedIntegrations[id],
        settings,
      },
    };
    saveConnections(updated);
    setShowSettingsModal(null);
  };

  // Build integrations list with status
  const integrations: Integration[] = AVAILABLE_INTEGRATIONS.map(int => ({
    ...int,
    status: connectedIntegrations[int.id] ? 'connected' : 'available',
    connectedAt: connectedIntegrations[int.id]?.connectedAt,
    settings: connectedIntegrations[int.id]?.settings,
  }));

  // Add coming soon integrations
  const comingSoonIntegrations: Integration[] = [
    { id: 'instapaper', name: 'Instapaper', description: 'Import saved articles from Instapaper', icon: '📰', category: 'import', status: 'coming_soon' },
    { id: 'readwise', name: 'Readwise', description: 'Sync highlights and notes', icon: '📚', category: 'import', status: 'coming_soon' },
    { id: 'roam', name: 'Roam Research', description: 'Export to Roam Research', icon: '🧠', category: 'export', status: 'coming_soon' },
    { id: 'evernote', name: 'Evernote', description: 'Export notes to Evernote', icon: '🐘', category: 'export', status: 'coming_soon' },
  ];

  const allIntegrations = [...integrations, ...comingSoonIntegrations];

  const categories = [
    { id: 'all', label: 'All Integrations', icon: '🔌' },
    { id: 'import', label: 'Import Sources', icon: '📥' },
    { id: 'export', label: 'Export Destinations', icon: '📤' },
    { id: 'ai', label: 'AI Providers', icon: '🤖' },
  ];

  const filteredIntegrations = allIntegrations.filter(int => {
    const matchesCategory = activeCategory === 'all' || int.category === activeCategory;
    const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedCount = Object.keys(connectedIntegrations).length;

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
          <IntegrationCard 
            key={integration.id} 
            integration={integration}
            onConnect={() => setShowConnectModal(integration)}
            onDisconnect={() => disconnectIntegration(integration.id)}
            onSettings={() => setShowSettingsModal(integration)}
          />
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

      {/* Connect Modal */}
      {showConnectModal && (
        <ConnectModal
          integration={showConnectModal}
          onClose={() => setShowConnectModal(null)}
          onConnect={(settings) => connectIntegration(showConnectModal.id, settings)}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          integration={showSettingsModal}
          onClose={() => setShowSettingsModal(null)}
          onSave={(settings) => updateSettings(showSettingsModal.id, settings)}
          onDisconnect={() => {
            disconnectIntegration(showSettingsModal.id);
            setShowSettingsModal(null);
          }}
        />
      )}
    </div>
  );
}

function IntegrationCard({ integration, onConnect, onDisconnect, onSettings }: { 
  integration: Integration;
  onConnect: () => void;
  onDisconnect: () => void;
  onSettings: () => void;
}) {
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
          <button 
            onClick={onSettings}
            style={{
              flex: 1,
              padding: '0.625rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              color: '#34d399',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            ⚙️ Settings
          </button>
          <button 
            onClick={onDisconnect}
            style={{
              padding: '0.625rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            Disconnect
          </button>
        </div>
      ) : integration.status === 'available' ? (
        <button 
          onClick={onConnect}
          style={{
            padding: '0.625rem',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
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
          Connected {formatRelativeDate(new Date(integration.connectedAt))}
        </p>
      )}
    </div>
  );
}

function ConnectModal({ integration, onClose, onConnect }: {
  integration: Integration;
  onClose: () => void;
  onConnect: (settings?: Record<string, any>) => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');

  // Different fields based on integration type
  const needsApiKey = ['openai', 'anthropic', 'google_ai'].includes(integration.id);
  const needsEndpoint = ['ollama'].includes(integration.id);

  const handleConnect = () => {
    const settings: Record<string, any> = {};
    if (needsApiKey && apiKey) settings.apiKey = apiKey;
    if (needsEndpoint && endpoint) settings.endpoint = endpoint;
    onConnect(Object.keys(settings).length > 0 ? settings : undefined);
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
        maxWidth: '450px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '16px',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>{integration.icon}</span>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Connect {integration.name}</h2>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {integration.description}
          </p>

          {needsApiKey && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${integration.name} API key`}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                🔒 Your API key is stored locally and never sent to our servers
              </p>
            </div>
          )}

          {needsEndpoint && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                Endpoint URL
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://localhost:11434"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {!needsApiKey && !needsEndpoint && (
            <div style={{
              padding: '1rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '8px',
              marginBottom: '1rem',
            }}>
              <p style={{ color: '#34d399', fontSize: '0.875rem', margin: 0 }}>
                ✓ This integration is ready to use with no additional configuration
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button 
              onClick={handleConnect}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ integration, onClose, onSave, onDisconnect }: {
  integration: Integration;
  onClose: () => void;
  onSave: (settings: Record<string, any>) => void;
  onDisconnect: () => void;
}) {
  const [apiKey, setApiKey] = useState(integration.settings?.apiKey || '');
  const [endpoint, setEndpoint] = useState(integration.settings?.endpoint || '');

  const needsApiKey = ['openai', 'anthropic', 'google_ai'].includes(integration.id);
  const needsEndpoint = ['ollama'].includes(integration.id);

  const handleSave = () => {
    const settings: Record<string, any> = {};
    if (needsApiKey && apiKey) settings.apiKey = apiKey;
    if (needsEndpoint && endpoint) settings.endpoint = endpoint;
    onSave(settings);
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
        maxWidth: '450px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '16px',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>{integration.icon}</span>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{integration.name} Settings</h2>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Connected status */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{ color: '#34d399' }}>✓</span>
            <span style={{ color: '#34d399', fontSize: '0.875rem' }}>
              Connected {integration.connectedAt && formatRelativeDate(new Date(integration.connectedAt))}
            </span>
          </div>

          {needsApiKey && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="••••••••••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {needsEndpoint && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                Endpoint URL
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://localhost:11434"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <button onClick={onClose} style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button 
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Save Changes
            </button>
          </div>

          {/* Disconnect button */}
          <button 
            onClick={onDisconnect}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#f87171',
              cursor: 'pointer',
            }}
          >
            Disconnect {integration.name}
          </button>
        </div>
      </div>
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
