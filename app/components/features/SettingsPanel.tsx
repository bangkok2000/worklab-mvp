'use client';

import React, { useState } from 'react';
import { Modal, Button, Input, Select, Badge, Card, EmptyState } from '../ui';

interface ApiKey {
  id: string;
  provider: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKey[];
  onAddKey: (provider: string, name: string, key: string) => void;
  onDeleteKey: (id: string) => void;
  onToggleKey: (id: string) => void;
  onTestKey: (id: string) => Promise<boolean>;
}

const providers = [
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { value: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { value: 'google', label: 'Google AI', placeholder: 'AIza...' },
  { value: 'ollama', label: 'Ollama (Local)', placeholder: 'http://localhost:11434' },
];

export default function SettingsPanel({
  isOpen,
  onClose,
  apiKeys,
  onAddKey,
  onDeleteKey,
  onToggleKey,
  onTestKey,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'api-keys' | 'preferences' | 'about'>('api-keys');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyProvider, setNewKeyProvider] = useState('openai');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  const handleAddKey = () => {
    if (newKeyName && newKeyValue) {
      onAddKey(newKeyProvider, newKeyName, newKeyValue);
      setNewKeyName('');
      setNewKeyValue('');
      setShowAddForm(false);
    }
  };

  const handleTestKey = async (id: string) => {
    setTestingKeyId(id);
    await onTestKey(id);
    setTestingKeyId(null);
  };

  const tabs = [
    { id: 'api-keys', label: 'API Keys', icon: '🔑' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
          paddingBottom: '0.75rem',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: activeTab === tab.id ? '#c4b5fd' : '#94a3b8',
              fontSize: '0.875rem',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
                Your API Keys
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                Add your own API keys for enhanced privacy and control
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowAddForm(true)}>
              + Add Key
            </Button>
          </div>

          {/* Add Key Form */}
          {showAddForm && (
            <Card variant="outlined" padding="md" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Select
                  label="Provider"
                  options={providers.map((p) => ({ value: p.value, label: p.label }))}
                  value={newKeyProvider}
                  onChange={(e) => setNewKeyProvider(e.target.value)}
                />
                <Input
                  label="Key Name"
                  placeholder="e.g., Personal, Work"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
                <Input
                  label="API Key"
                  type="password"
                  placeholder={providers.find((p) => p.value === newKeyProvider)?.placeholder}
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleAddKey}>
                    Save Key
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Keys List */}
          {apiKeys.length === 0 ? (
            <EmptyState
              icon="🔑"
              title="No API keys configured"
              description="Add your own API keys to use your own accounts"
              action={{ label: 'Add Your First Key', onClick: () => setShowAddForm(true) }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {apiKeys.map((key) => (
                <ApiKeyCard
                  key={key.id}
                  apiKey={key}
                  onDelete={() => onDeleteKey(key.id)}
                  onToggle={() => onToggleKey(key.id)}
                  onTest={() => handleTestKey(key.id)}
                  isTesting={testingKeyId === key.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>
            Preferences
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Preferences settings coming soon...
          </p>
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)',
            }}
          >
            🌙
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
            MoonScribe
          </h2>
          <Badge variant="purple">v0.1.0</Badge>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '1rem', maxWidth: '400px', margin: '1rem auto' }}>
            Your AI-powered document intelligence platform. Upload documents, ask questions, and get instant insights with BYOK (Bring Your Own Key) support.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Button variant="ghost" size="sm">Documentation</Button>
            <Button variant="ghost" size="sm">GitHub</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// API Key Card component
function ApiKeyCard({
  apiKey,
  onDelete,
  onToggle,
  onTest,
  isTesting,
}: {
  apiKey: ApiKey;
  onDelete: () => void;
  onToggle: () => void;
  onTest: () => void;
  isTesting: boolean;
}) {
  const providerLabels: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google AI',
    ollama: 'Ollama',
  };

  return (
    <div
      style={{
        padding: '1rem',
        background: 'rgba(139, 92, 246, 0.06)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: 500, color: '#f1f5f9', fontSize: '0.875rem' }}>{apiKey.name}</span>
          <Badge variant={apiKey.isActive ? 'success' : 'default'} size="sm">
            {apiKey.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {providerLabels[apiKey.provider] || apiKey.provider}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button variant="ghost" size="sm" onClick={onTest} isLoading={isTesting}>
          Test
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          {apiKey.isActive ? 'Disable' : 'Enable'}
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
