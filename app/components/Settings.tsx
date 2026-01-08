'use client';

import { useState, useEffect } from 'react';
import { 
  getStoredApiKeys, 
  saveApiKey, 
  deleteApiKey, 
  toggleApiKey,
  validateApiKey,
  testApiKey,
  type Provider,
  type ApiKeyConfig,
} from '@/lib/utils/api-keys';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
}

const PROVIDERS: { value: Provider; label: string; models: string[] }[] = [
  {
    value: 'openai',
    label: 'OpenAI',
    models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  },
  {
    value: 'google',
    label: 'Google',
    models: ['gemini-pro'],
  },
  {
    value: 'ollama',
    label: 'Ollama (Local)',
    models: ['llama2', 'mistral', 'codellama'],
  },
];

export default function Settings({ isOpen, onClose, userId = null }: SettingsProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [showAddKey, setShowAddKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider>('openai');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyError, setNewKeyError] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      loadApiKeys();
    }
  }, [isOpen, userId]);

  const loadApiKeys = () => {
    const keys = getStoredApiKeys(userId);
    setApiKeys(keys);
  };

  const handleAddKey = async () => {
    setNewKeyError('');
    
    // Validate
    const validation = validateApiKey(selectedProvider, newKeyValue);
    if (!validation.valid) {
      setNewKeyError(validation.error || 'Invalid API key');
      return;
    }

    setSaving(true);
    try {
      // Test the key first
      setTesting(selectedProvider);
      const testResult = await testApiKey(selectedProvider, newKeyValue);
      
      if (!testResult.success) {
        setNewKeyError(testResult.error || 'API key test failed');
        setTesting(null);
        setSaving(false);
        return;
      }

      // Save the key
      await saveApiKey(selectedProvider, newKeyValue, newKeyName || `${selectedProvider} key`, userId);
      
      // Reset form
      setNewKeyName('');
      setNewKeyValue('');
      setNewKeyError('');
      setShowAddKey(false);
      loadApiKeys();
      
      // Trigger a custom event to notify parent component
      window.dispatchEvent(new CustomEvent('apiKeysUpdated'));
    } catch (error: any) {
      setNewKeyError(error.message || 'Failed to save API key');
    } finally {
      setSaving(false);
      setTesting(null);
    }
  };

  const handleDeleteKey = (keyId: string) => {
    if (confirm('Delete this API key? This action cannot be undone.')) {
      deleteApiKey(keyId, userId);
      loadApiKeys();
    }
  };

  const handleToggleKey = (keyId: string) => {
    toggleApiKey(keyId, userId);
    loadApiKeys();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 600 }}>⚙️ Settings</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            ×
          </button>
        </div>

        {/* API Keys Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>🔑 API Keys</h3>
            <button
              onClick={() => setShowAddKey(!showAddKey)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              + Add Key
            </button>
          </div>

          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
            Your API keys are encrypted and stored locally in your browser. They are never sent to our servers.
          </p>

          {/* Add Key Form */}
          {showAddKey && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                  Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as Provider)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  {PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                  Key Name (optional)
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={`${selectedProvider} key`}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={newKeyValue}
                  onChange={(e) => {
                    setNewKeyValue(e.target.value);
                    setNewKeyError('');
                  }}
                  placeholder={selectedProvider === 'ollama' ? 'http://localhost:11434' : 'Enter API key...'}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: newKeyError ? '1px solid #dc2626' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                {newKeyError && (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{newKeyError}</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAddKey}
                  disabled={!newKeyValue.trim() || saving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: saving ? '#ccc' : '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {testing ? `Testing ${selectedProvider}...` : saving ? 'Saving...' : 'Save & Test'}
                </button>
                <button
                  onClick={() => {
                    setShowAddKey(false);
                    setNewKeyName('');
                    setNewKeyValue('');
                    setNewKeyError('');
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing Keys */}
          {apiKeys.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
              No API keys configured. Add one to get started.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  style={{
                    padding: '16px',
                    backgroundColor: key.isActive ? 'white' : '#f9f9f9',
                    border: `1px solid ${key.isActive ? '#0070f3' : '#ddd'}`,
                    borderRadius: '8px',
                    opacity: key.isActive ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 600 }}>
                          {PROVIDERS.find(p => p.value === key.provider)?.label || key.provider}
                        </span>
                        {key.isActive && (
                          <span style={{
                            fontSize: '11px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                          }}>
                            Active
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '14px', color: '#666', margin: '4px 0' }}>
                        {key.keyName}
                      </p>
                      <p style={{ fontSize: '12px', color: '#999', fontFamily: 'monospace' }}>
                        {key.encryptedKey.substring(0, 20)}... (encrypted)
                      </p>
                      {key.lastUsedAt && (
                        <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                          Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleToggleKey(key.id)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                        }}
                        title={key.isActive ? 'Disable' : 'Enable'}
                      >
                        {key.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          backgroundColor: 'white',
                          color: '#dc2626',
                          cursor: 'pointer',
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div style={{
          padding: '16px',
          backgroundColor: '#f0f9ff',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#1e40af',
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>ℹ️ How it works:</p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Keys are encrypted using your browser's Web Crypto API</li>
            <li>Keys are stored locally and never sent to our servers</li>
            <li>You can use different providers for different requests</li>
            <li>Test your keys before saving to ensure they work</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
