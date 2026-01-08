'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, Badge, Select, EmptyState } from '../components/ui';
import { getStoredApiKeys, saveApiKey, deleteApiKey, toggleApiKey, testApiKey, type Provider, type ApiKeyConfig } from '@/lib/utils/api-keys';

const providers = [
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-...', description: 'GPT-4, GPT-3.5 models' },
  { value: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...', description: 'Claude 3 models' },
  { value: 'google', label: 'Google AI', placeholder: 'AIza...', description: 'Gemini models' },
  { value: 'ollama', label: 'Ollama', placeholder: 'http://localhost:11434', description: 'Local models' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'api-keys' | 'appearance' | 'data' | 'about'>('api-keys');
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
    setApiKeys(getStoredApiKeys(null));
  }, [isMounted]);

  const handleAddKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) return;
    setAddingKey(true);
    
    try {
      await saveApiKey(newProvider, newKeyName.trim(), newKeyValue.trim(), null);
      setApiKeys(getStoredApiKeys(null));
      setNewKeyName('');
      setNewKeyValue('');
      setShowAddKey(false);
    } catch (e) {
      console.error('Failed to save key:', e);
    }
    
    setAddingKey(false);
  };

  const handleDeleteKey = (id: string) => {
    if (confirm('Delete this API key?')) {
      deleteApiKey(id, null);
      setApiKeys(getStoredApiKeys(null));
    }
  };

  const handleToggleKey = (id: string) => {
    toggleApiKey(id, null);
    setApiKeys(getStoredApiKeys(null));
  };

  const handleTestKey = async (id: string) => {
    setTestingKey(id);
    const success = await testApiKey(id, null);
    alert(success ? 'API key is valid!' : 'API key test failed');
    setTestingKey(null);
  };

  const handleExportData = () => {
    const data = {
      projects: localStorage.getItem('moonscribe-projects'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moonscribe-export.json';
    a.click();
  };

  const handleClearData = () => {
    if (confirm('This will delete ALL your data including projects, documents, and conversations. This cannot be undone. Continue?')) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('moonscribe-'));
      keys.forEach(k => localStorage.removeItem(k));
      alert('All data cleared');
      router.push('/');
    }
  };

  const tabs = [
    { id: 'api-keys', label: 'API Keys', icon: '🔑' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'data', label: 'Data', icon: '💾' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f23 50%, #1a1a2e 100%)',
      color: '#f1f5f9',
    }}>
      {/* Header */}
      <header style={{
        padding: '1.5rem 2rem',
        borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
        background: 'rgba(15, 15, 35, 0.8)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            cursor: 'pointer',
            color: '#c4b5fd',
            fontSize: '0.875rem',
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Settings</h1>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
          paddingBottom: '1rem',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: '0.75rem 1.25rem',
                background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                color: activeTab === tab.id ? '#c4b5fd' : '#94a3b8',
                fontSize: '0.9375rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>API Keys</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9375rem' }}>
                  Bring your own API keys for full control and privacy
                </p>
              </div>
              <Button variant="primary" onClick={() => setShowAddKey(true)}>
                + Add API Key
              </Button>
            </div>

            {/* Add Key Form */}
            {showAddKey && (
              <Card variant="outlined" padding="lg" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Add New API Key</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Select
                    label="Provider"
                    options={providers.map(p => ({ value: p.value, label: p.label }))}
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value as Provider)}
                  />
                  <Input
                    label="Key Name"
                    placeholder="e.g., Personal, Work, Testing"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                  <Input
                    label="API Key"
                    type="password"
                    placeholder={providers.find(p => p.value === newProvider)?.placeholder}
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    hint={providers.find(p => p.value === newProvider)?.description}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <Button variant="ghost" onClick={() => setShowAddKey(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleAddKey} isLoading={addingKey}>
                      Save Key
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Keys List */}
            {apiKeys.length === 0 ? (
              <Card variant="outlined" padding="lg">
                <EmptyState
                  icon="🔑"
                  title="No API keys configured"
                  description="Add your own API keys to use your accounts and ensure data privacy"
                  action={{ label: 'Add Your First Key', onClick: () => setShowAddKey(true) }}
                />
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {apiKeys.map(key => (
                  <Card key={key.id} variant="outlined" padding="md">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 500, color: '#f1f5f9' }}>{key.keyName}</span>
                          <Badge variant={key.isActive ? 'success' : 'default'} size="sm">
                            {key.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                          {providers.find(p => p.value === key.provider)?.label || key.provider}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="ghost" size="sm" onClick={() => handleTestKey(key.id)} isLoading={testingKey === key.id}>
                          Test
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleKey(key.id)}>
                          {key.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteKey(key.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Appearance</h2>
            <Card variant="outlined" padding="lg">
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
                Theme customization coming soon...
              </p>
            </Card>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Data Management</h2>
            
            <Card variant="outlined" padding="lg" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Export Data</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Download all your projects and settings as a JSON file
              </p>
              <Button variant="secondary" onClick={handleExportData}>
                📥 Export All Data
              </Button>
            </Card>

            <Card variant="outlined" padding="lg" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ef4444' }}>
                Danger Zone
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Permanently delete all your data. This action cannot be undone.
              </p>
              <Button variant="danger" onClick={handleClearData}>
                🗑️ Delete All Data
              </Button>
            </Card>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              boxShadow: '0 0 40px rgba(139, 92, 246, 0.4)',
            }}>
              🌙
            </div>
            
            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>MoonScribe</h2>
            <Badge variant="purple" size="md">Version 0.2.0</Badge>
            
            <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '1.5rem', maxWidth: '500px', margin: '1.5rem auto' }}>
              Your AI-powered document intelligence platform. Upload documents, organize them into projects, 
              and get instant AI-powered insights with BYOK (Bring Your Own Key) support.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
              <Button variant="ghost">📚 Documentation</Button>
              <Button variant="ghost">🐙 GitHub</Button>
              <Button variant="ghost">💬 Discord</Button>
            </div>

            <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Features</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                {['Multi-Project Support', 'PDF Processing', 'RAG Search', 'BYOK Support', 'Chat History', 'Local Storage'].map(f => (
                  <Badge key={f} variant="purple">{f}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
