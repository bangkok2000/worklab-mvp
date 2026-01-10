'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredApiKeys, saveApiKey, deleteApiKey, toggleApiKey, testApiKey, type Provider, type ApiKeyConfig } from '@/lib/utils/api-keys';
import { useAuth } from '@/lib/auth';
import TeamSettings from '@/app/components/features/TeamSettings';

const providers = [
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-...', description: 'GPT-4, GPT-3.5 models' },
  { value: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...', description: 'Claude 3 models' },
  { value: 'google', label: 'Google AI', placeholder: 'AIza...', description: 'Gemini models' },
  { value: 'ollama', label: 'Ollama', placeholder: 'http://localhost:11434', description: 'Local models' },
];

type TabId = 'api-keys' | 'team' | 'integrations' | 'privacy' | 'profile' | 'preferences' | 'billing' | 'data';
const validTabs: TabId[] = ['api-keys', 'team', 'integrations', 'privacy', 'profile', 'preferences', 'billing', 'data'];

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut, updateProfile } = useAuth();
  
  // Profile editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('api-keys');
  
  // Read tab from URL query param after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabFromUrl = params.get('tab') as TabId | null;
      if (tabFromUrl && validTabs.includes(tabFromUrl)) {
        setActiveTab(tabFromUrl);
      }
    }
  }, []);
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // New key form
  const [showAddKey, setShowAddKey] = useState(false);
  const [newProvider, setNewProvider] = useState<Provider>('openai');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    setApiKeys(getStoredApiKeys(user?.id || null));
  }, [isMounted, user]);

  // Dispatch event to notify other components (like CreditBalance) about key changes
  const notifyApiKeyChange = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('moonscribe-apikey-changed'));
    }
  };

  const handleAddKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) return;
    setAddingKey(true);
    try {
      await saveApiKey(newProvider, newKeyValue.trim(), newKeyName.trim(), user?.id || null);
      setApiKeys(getStoredApiKeys(user?.id || null));
      setNewKeyName('');
      setNewKeyValue('');
      setShowAddKey(false);
      notifyApiKeyChange();
      // Dispatch the correct event name
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('moonscribe-api-keys-changed'));
      }
    } catch (e) {
      console.error('Failed to save key:', e);
    }
    setAddingKey(false);
  };

  const handleDeleteKey = (id: string) => {
    if (confirm('Delete this API key?')) {
      deleteApiKey(id, user?.id || null);
      setApiKeys(getStoredApiKeys(user?.id || null));
      notifyApiKeyChange();
    }
  };

  const handleToggleKey = (id: string) => {
    toggleApiKey(id, user?.id || null);
    setApiKeys(getStoredApiKeys(user?.id || null));
    notifyApiKeyChange();
  };

  const handleTestKey = async (id: string) => {
    setTestingKey(id);
    const keyConfig = apiKeys.find(k => k.id === id);
    if (!keyConfig) {
      alert('Key not found');
      setTestingKey(null);
      return;
    }
    // Note: We can't test encrypted keys without decryption
    // For now, just show a placeholder
    alert('API key testing requires decryption - feature coming soon');
    setTestingKey(null);
  };

  const tabs = [
    { id: 'api-keys', label: 'API Keys', icon: '🔑' },
    { id: 'team', label: 'Team', icon: '👥' },
    { id: 'integrations', label: 'Integrations', icon: '🔌' },
    { id: 'privacy', label: 'Data & Privacy', icon: '🔒' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'data', label: 'Manage Data', icon: '💾' },
  ];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar */}
      <div style={{
        width: '240px',
        minWidth: '240px',
        borderRight: '1px solid rgba(139, 92, 246, 0.15)',
        padding: '1.5rem 1rem',
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', padding: '0 0.5rem' }}>
          ⚙️ Settings
        </h1>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: '0.75rem 1rem',
                background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === tab.id ? '#c4b5fd' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.9375rem',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div style={{ maxWidth: '700px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>API Keys</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                Bring your own API keys for full control and privacy. Your keys are encrypted and stored locally.
              </p>
            </div>

            {/* Add Key Button */}
            {!showAddKey && (
              <button
                onClick={() => setShowAddKey(true)}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginBottom: '1.5rem',
                }}
              >
                + Add API Key
              </button>
            )}

            {/* Add Key Form */}
            {showAddKey && (
              <div style={{
                padding: '1.5rem',
                background: 'rgba(15, 15, 35, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '12px',
                marginBottom: '1.5rem',
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Add New API Key</h3>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                    Provider
                  </label>
                  <select
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value as Provider)}
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
                  >
                    {providers.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Personal, Work, Testing"
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

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                    API Key
                  </label>
                  <input
                    type="password"
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    placeholder={providers.find(p => p.value === newProvider)?.placeholder}
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
                    {providers.find(p => p.value === newProvider)?.description}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowAddKey(false)}
                    style={{
                      padding: '0.625rem 1.25rem',
                      background: 'transparent',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddKey}
                    disabled={addingKey || !newKeyName.trim() || !newKeyValue.trim()}
                    style={{
                      padding: '0.625rem 1.25rem',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 500,
                      cursor: 'pointer',
                      opacity: addingKey || !newKeyName.trim() || !newKeyValue.trim() ? 0.5 : 1,
                    }}
                  >
                    {addingKey ? 'Saving...' : 'Save Key'}
                  </button>
                </div>
              </div>
            )}

            {/* Keys List */}
            {apiKeys.length === 0 ? (
              <div style={{
                padding: '3rem',
                background: 'rgba(15, 15, 35, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔑</div>
                <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No API keys configured</h3>
                <p style={{ color: '#64748b' }}>Add your API keys to use your own AI providers</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {apiKeys.map(key => (
                  <div key={key.id} style={{
                    padding: '1rem 1.25rem',
                    background: 'rgba(15, 15, 35, 0.6)',
                    border: key.isActive 
                      ? '1px solid rgba(16, 185, 129, 0.3)' 
                      : '1px solid rgba(139, 92, 246, 0.15)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: key.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}>
                      🔑
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{key.keyName}</span>
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          background: key.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                          color: key.isActive ? '#34d399' : '#94a3b8',
                          borderRadius: '4px',
                          fontSize: '0.6875rem',
                        }}>
                          {key.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                        {providers.find(p => p.value === key.provider)?.label || key.provider}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleTestKey(key.id)}
                        disabled={testingKey === key.id}
                        style={{
                          padding: '0.5rem 0.875rem',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          color: '#60a5fa',
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                        }}
                      >
                        {testingKey === key.id ? '...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleToggleKey(key.id)}
                        style={{
                          padding: '0.5rem 0.875rem',
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          borderRadius: '6px',
                          color: '#c4b5fd',
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                        }}
                      >
                        {key.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        style={{
                          padding: '0.5rem 0.875rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          color: '#f87171',
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <TeamSettings />
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div style={{ maxWidth: '700px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Integrations</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                Connect MoonScribe with your favorite tools and services.
              </p>
            </div>

            {/* Import Sources */}
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem', marginTop: '0.5rem' }}>
              📥 Import Sources
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}>
              {[
                { id: 'google-drive', name: 'Google Drive', icon: '📁', description: 'Import docs, slides, and files' },
                { id: 'dropbox', name: 'Dropbox', icon: '📦', description: 'Sync files from Dropbox' },
                { id: 'onedrive', name: 'OneDrive', icon: '☁️', description: 'Import from Microsoft OneDrive' },
                { id: 'pocket', name: 'Pocket', icon: '👝', description: 'Import saved articles' },
                { id: 'readwise', name: 'Readwise', icon: '📖', description: 'Sync highlights and notes' },
                { id: 'chrome', name: 'Chrome Extension', icon: '🌐', description: 'Capture while browsing' },
                { id: 'firefox', name: 'Firefox Extension', icon: '🦊', description: 'Capture while browsing' },
              ].map(integration => (
                <IntegrationCard key={integration.id} {...integration} status="coming_soon" />
              ))}
            </div>

            {/* Export Destinations */}
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>
              📤 Export Destinations
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}>
              {[
                { id: 'notion', name: 'Notion', icon: '📓', description: 'Export insights to Notion pages' },
                { id: 'obsidian', name: 'Obsidian', icon: '💎', description: 'Sync with your Obsidian vault' },
                { id: 'roam', name: 'Roam Research', icon: '🔗', description: 'Export to Roam graphs' },
                { id: 'evernote', name: 'Evernote', icon: '🐘', description: 'Save insights to Evernote' },
                { id: 'google-docs', name: 'Google Docs', icon: '📝', description: 'Export as Google Docs' },
                { id: 'markdown', name: 'Markdown Files', icon: '📄', description: 'Download as .md files' },
              ].map(integration => (
                <IntegrationCard key={integration.id} {...integration} status="coming_soon" />
              ))}
            </div>

            {/* Communication */}
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>
              💬 Communication
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}>
              {[
                { id: 'slack', name: 'Slack', icon: '💬', description: 'Share insights to channels' },
                { id: 'discord', name: 'Discord', icon: '🎮', description: 'Post to Discord servers' },
                { id: 'teams', name: 'Microsoft Teams', icon: '👥', description: 'Share to Teams channels' },
                { id: 'email', name: 'Email', icon: '📧', description: 'Send insights via email' },
              ].map(integration => (
                <IntegrationCard key={integration.id} {...integration} status="coming_soon" />
              ))}
            </div>

            {/* Automation */}
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>
              ⚡ Automation
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}>
              {[
                { id: 'zapier', name: 'Zapier', icon: '⚡', description: 'Connect to 5000+ apps' },
                { id: 'make', name: 'Make (Integromat)', icon: '🔧', description: 'Visual automation workflows' },
                { id: 'ifttt', name: 'IFTTT', icon: '🔀', description: 'Simple automation triggers' },
                { id: 'api', name: 'API Access', icon: '🔌', description: 'Build custom integrations' },
              ].map(integration => (
                <IntegrationCard key={integration.id} {...integration} status="coming_soon" />
              ))}
            </div>

            {/* Media Sources */}
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>
              🎬 Media Sources
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}>
              {[
                { id: 'youtube', name: 'YouTube', icon: '▶️', description: 'Import video transcripts' },
                { id: 'spotify', name: 'Spotify Podcasts', icon: '🎧', description: 'Transcribe podcast episodes' },
                { id: 'apple-podcasts', name: 'Apple Podcasts', icon: '🎙️', description: 'Import podcast transcripts' },
                { id: 'vimeo', name: 'Vimeo', icon: '🎬', description: 'Import video content' },
              ].map(integration => (
                <IntegrationCard key={integration.id} {...integration} status="coming_soon" />
              ))}
            </div>

            {/* Request Integration */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h3 style={{ color: '#c4b5fd', fontWeight: 600, marginBottom: '0.5rem' }}>
                Need a specific integration?
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Let us know which tools you&apos;d like to connect with MoonScribe.
              </p>
              <button style={{
                padding: '0.625rem 1.25rem',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                color: '#c4b5fd',
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                Request Integration
              </button>
            </div>
          </div>
        )}

        {/* Data & Privacy Tab */}
        {activeTab === 'privacy' && (
          <div style={{ maxWidth: '700px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Data & Privacy</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                Understand where your data is stored and how MoonScribe protects your privacy.
              </p>
            </div>

            {/* Current Storage Mode */}
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                }}>
                  🔒
                </div>
                <div>
                  <h3 style={{ color: '#34d399', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Local Storage Mode</h3>
                  <p style={{ color: '#6ee7b7', fontSize: '0.8125rem', margin: 0 }}>Your data stays on this device</p>
                </div>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                All your documents, conversations, and insights are stored locally on your device. 
                Nothing is uploaded to our servers unless you explicitly choose to sync.
              </p>
            </div>

            {/* BYOK Philosophy */}
            <div style={{
              padding: '1.5rem',
              background: 'rgba(15, 15, 35, 0.6)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '16px',
              marginBottom: '1.5rem',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🔑</span> BYOK Philosophy
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                <strong style={{ color: '#f1f5f9' }}>Bring Your Own Key</strong> means you control everything:
              </p>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                <p style={{ margin: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#34d399' }}>✓</span> Your API keys - stored encrypted on your device
                </p>
                <p style={{ margin: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#34d399' }}>✓</span> Your documents - stored locally, never uploaded
                </p>
                <p style={{ margin: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#34d399' }}>✓</span> Your conversations - stored locally on this device
                </p>
                <p style={{ margin: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#34d399' }}>✓</span> Your insights - stored locally, exportable anytime
                </p>
              </div>
            </div>

            {/* Where Data is Stored */}
            <div style={{
              padding: '1.5rem',
              background: 'rgba(15, 15, 35, 0.6)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '16px',
              marginBottom: '1.5rem',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Where Your Data Lives</h3>
              
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Data Type</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Location</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { type: 'API Keys', location: 'This device (encrypted)', status: 'local' },
                    { type: 'Documents', location: 'This device', status: 'local' },
                    { type: 'Projects', location: 'This device', status: 'local' },
                    { type: 'Conversations', location: 'This device', status: 'local' },
                    { type: 'Insights', location: 'This device', status: 'local' },
                    { type: 'Search Vectors', location: 'Pinecone (text fragments)', status: 'cloud' },
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.08)' }}>
                      <td style={{ padding: '0.75rem 0', color: '#f1f5f9', fontSize: '0.875rem' }}>{row.type}</td>
                      <td style={{ padding: '0.75rem 0', color: '#94a3b8', fontSize: '0.875rem' }}>{row.location}</td>
                      <td style={{ padding: '0.75rem 0' }}>
                        <span style={{
                          padding: '0.25rem 0.625rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          background: row.status === 'local' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: row.status === 'local' ? '#34d399' : '#60a5fa',
                        }}>
                          {row.status === 'local' ? '🔒 Local' : '☁️ Cloud'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                color: '#94a3b8',
              }}>
                <strong style={{ color: '#60a5fa' }}>About Search Vectors:</strong> When you upload documents, 
                small text fragments are sent to Pinecone for AI search. These are just chunks of text without 
                filenames or identifying information - they're meaningless without the full context stored on your device.
              </div>
            </div>

            {/* Cloud Sync Option */}
            <div style={{
              padding: '1.5rem',
              background: 'rgba(15, 15, 35, 0.6)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '16px',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Want to Sync Across Devices?</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Create an account to enable cloud sync. Your data will be encrypted before upload.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button style={{
                  padding: '0.75rem 1.25rem',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}>
                  Create Account
                </button>
                <button style={{
                  padding: '0.75rem 1.25rem',
                  background: 'transparent',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}>
                  Learn More
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1rem' }}>
                You can continue using MoonScribe without an account. Your data remains local and private.
              </p>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Profile</h2>
            
            {user ? (
              /* Signed In User */
              <div style={{
                padding: '2rem',
                background: 'rgba(15, 15, 35, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {user.user_metadata?.full_name?.charAt(0).toUpperCase() || 
                     user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div style={{ flex: 1 }}>
                    {isEditingName ? (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          placeholder="Enter your name"
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '6px',
                            color: '#f1f5f9',
                            fontSize: '1rem',
                            fontWeight: 600,
                            outline: 'none',
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && editedName.trim()) {
                              setSavingProfile(true);
                              setProfileMessage(null);
                              const { error } = await updateProfile({ fullName: editedName.trim() });
                              setSavingProfile(false);
                              if (error) {
                                setProfileMessage({ type: 'error', text: error.message });
                              } else {
                                setProfileMessage({ type: 'success', text: 'Name updated!' });
                                setIsEditingName(false);
                                setTimeout(() => setProfileMessage(null), 3000);
                              }
                            }
                            if (e.key === 'Escape') {
                              setIsEditingName(false);
                              setEditedName(user.user_metadata?.full_name || '');
                            }
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button
                            onClick={async () => {
                              if (!editedName.trim()) return;
                              setSavingProfile(true);
                              setProfileMessage(null);
                              const { error } = await updateProfile({ fullName: editedName.trim() });
                              setSavingProfile(false);
                              if (error) {
                                setProfileMessage({ type: 'error', text: error.message });
                              } else {
                                setProfileMessage({ type: 'success', text: 'Name updated!' });
                                setIsEditingName(false);
                                setTimeout(() => setProfileMessage(null), 3000);
                              }
                            }}
                            disabled={savingProfile || !editedName.trim()}
                            style={{
                              padding: '0.375rem 0.75rem',
                              background: 'rgba(16, 185, 129, 0.2)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              borderRadius: '6px',
                              color: '#34d399',
                              fontSize: '0.75rem',
                              cursor: savingProfile || !editedName.trim() ? 'not-allowed' : 'pointer',
                              opacity: savingProfile || !editedName.trim() ? 0.5 : 1,
                            }}
                          >
                            {savingProfile ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingName(false);
                              setEditedName(user.user_metadata?.full_name || '');
                            }}
                            style={{
                              padding: '0.375rem 0.75rem',
                              background: 'transparent',
                              border: '1px solid rgba(100, 116, 139, 0.3)',
                              borderRadius: '6px',
                              color: '#94a3b8',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
                          {user.user_metadata?.full_name || 
                           (user.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'User')}
                        </h3>
                        <button
                          onClick={() => {
                            setEditedName(user.user_metadata?.full_name || '');
                            setIsEditingName(true);
                            setProfileMessage(null);
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            borderRadius: '4px',
                            color: '#c4b5fd',
                            fontSize: '0.6875rem',
                            cursor: 'pointer',
                          }}
                          title="Edit name"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    )}
                    <p style={{ color: '#94a3b8', fontSize: '0.9375rem', wordBreak: 'break-all', margin: 0 }}>
                      {user.email}
                    </p>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '0.5rem',
                      padding: '0.25rem 0.75rem',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '20px',
                      color: '#34d399',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}>
                      ✓ Verified Account
                    </span>
                  </div>
                </div>

                {/* Success/Error Message */}
                {profileMessage && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: profileMessage.type === 'success' 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${profileMessage.type === 'success' 
                      ? 'rgba(16, 185, 129, 0.3)' 
                      : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    color: profileMessage.type === 'success' ? '#34d399' : '#f87171',
                    fontSize: '0.875rem',
                  }}>
                    {profileMessage.type === 'success' ? '✓' : '⚠️'} {profileMessage.text}
                  </div>
                )}

                {/* Account Info */}
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Member since</span>
                    <span style={{ color: '#f1f5f9', fontSize: '0.875rem' }}>
                      {new Date(user.created_at || '').toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Account ID</span>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {user.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    onClick={async () => {
                      await signOut();
                      router.push('/auth/signin');
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: '#f87171',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </div>
            ) : (
              /* Guest Mode */
              <div style={{
                padding: '2rem',
                background: 'rgba(15, 15, 35, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '16px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(139, 92, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 1rem',
                }}>
                  👤
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                  Guest Mode
                </h3>
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                  Sign in to sync your data across devices
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button 
                    onClick={() => router.push('/auth/signin')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    🔑 Sign In
                  </button>
                  <button 
                    onClick={() => router.push('/auth/signup')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      color: '#c4b5fd',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    ✨ Create Account
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Preferences</h2>
            
            <div style={{
              padding: '1.5rem',
              background: 'rgba(15, 15, 35, 0.6)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '16px',
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.9375rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Default AI Provider
                </label>
                <select style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}>
                  <option>OpenAI</option>
                  <option>Anthropic</option>
                  <option>Google AI</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.9375rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Theme
                </label>
                <select style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}>
                  <option>Dark (Default)</option>
                  <option>Light</option>
                  <option>System</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
                  <span style={{ color: '#f1f5f9' }}>Show source citations in responses</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Billing</h2>
            
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '16px',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: 'rgba(139, 92, 246, 0.2)',
                    color: '#c4b5fd',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    FREE TIER
                  </span>
                </div>
                <button style={{
                  padding: '0.625rem 1.25rem',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}>
                  Upgrade to Pro
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>3</p>
                  <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Projects</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>50</p>
                  <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Documents</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>100</p>
                  <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>AI Queries/mo</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Data Management</h2>
            
            <div style={{
              padding: '1.5rem',
              background: 'rgba(15, 15, 35, 0.6)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '16px',
              marginBottom: '1rem',
            }}>
              <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Export Data</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Download all your projects, documents, and settings
              </p>
              <button style={{
                padding: '0.625rem 1.25rem',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                color: '#c4b5fd',
                cursor: 'pointer',
              }}>
                📥 Export All Data
              </button>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '16px',
            }}>
              <h3 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Danger Zone</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Permanently delete all your data. This cannot be undone.
              </p>
              <button style={{
                padding: '0.625rem 1.25rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                cursor: 'pointer',
              }}>
                🗑️ Delete All Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Integration Card Component
function IntegrationCard({ 
  name, 
  icon, 
  description, 
  status 
}: { 
  name: string; 
  icon: string; 
  description: string; 
  status: 'connected' | 'available' | 'coming_soon';
}) {
  return (
    <div style={{
      padding: '1rem',
      background: 'rgba(15, 15, 35, 0.6)',
      border: '1px solid rgba(139, 92, 246, 0.15)',
      borderRadius: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9375rem', margin: 0 }}>
            {name}
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {description}
          </p>
        </div>
      </div>
      {status === 'coming_soon' && (
        <span style={{
          display: 'inline-block',
          padding: '0.2rem 0.5rem',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          borderRadius: '4px',
          color: '#fbbf24',
          fontSize: '0.6875rem',
          fontWeight: 500,
        }}>
          Coming Soon
        </span>
      )}
      {status === 'available' && (
        <button style={{
          padding: '0.375rem 0.75rem',
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '6px',
          color: '#c4b5fd',
          fontSize: '0.75rem',
          fontWeight: 500,
          cursor: 'pointer',
        }}>
          Connect
        </button>
      )}
      {status === 'connected' && (
        <span style={{
          display: 'inline-block',
          padding: '0.2rem 0.5rem',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '4px',
          color: '#34d399',
          fontSize: '0.6875rem',
          fontWeight: 500,
        }}>
          ✓ Connected
        </span>
      )}
    </div>
  );
}
