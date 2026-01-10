'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SourcesPanel, ChatPanel, HistoryPanel, SettingsPanel, SignUpRequiredModal } from '../../../components/features';
import { Button, Badge } from '../../../components/ui';
import { getDecryptedApiKey, getStoredApiKeys, type Provider, type ApiKeyConfig } from '@/lib/utils/api-keys';
import { useAuth } from '@/lib/auth';
import { 
  canGuestPerformAction, 
  recordGuestAction, 
  getGuestUsage, 
  getGuestLimit,
  hasGuestReachedLimit 
} from '@/lib/utils/guest-limits';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { number: number; source: string; relevance?: number }[];
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

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

interface Project {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  conversationCount: number;
  createdAt: Date;
  updatedAt: Date;
  color: string;
}

const modelsByProvider: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  ],
  google: [{ value: 'gemini-pro', label: 'Gemini Pro' }],
  ollama: [{ value: 'llama2', label: 'Llama 2' }],
};

export default function ProjectWorkspace() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { user } = useAuth();

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // UI State
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [showSignUpRequired, setShowSignUpRequired] = useState(false);

  // API State
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [provider, setProvider] = useState<string>('openai');
  const [model, setModel] = useState<string>('gpt-3.5-turbo');
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load project data
  useEffect(() => {
    if (!isMounted || !projectId) return;

    try {
      // Load project info
      const savedProjects = localStorage.getItem('moonscribe-projects');
      if (savedProjects) {
        const projects = JSON.parse(savedProjects);
        const proj = projects.find((p: any) => p.id === projectId);
        if (proj) {
          setProject({
            ...proj,
            createdAt: new Date(proj.createdAt),
            updatedAt: new Date(proj.updatedAt),
          });
        } else {
          router.push('/app/projects');
          return;
        }
      }

      // Load project documents (PDFs uploaded directly)
      const savedDocs = localStorage.getItem(`moonscribe-project-${projectId}-documents`);
      const directDocs = savedDocs ? JSON.parse(savedDocs).map((d: any) => ({
        ...d,
        uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : undefined,
      })) : [];

      // Load all project content (YouTube, Web, Notes, Images, etc.)
      const savedContent = localStorage.getItem(`moonscribe-project-content-${projectId}`);
      const allContent = savedContent ? JSON.parse(savedContent) : [];
      
      // Convert all content to document format for display
      const contentAsDocs = allContent.map((item: any) => ({
        id: item.id,
        name: item.title || item.name || 'Untitled',
        status: item.processed ? 'ready' as const : 'processing' as const,
        chunks: item.chunksProcessed,
        uploadedAt: item.addedAt ? new Date(item.addedAt) : undefined,
        type: item.type, // Store original type for display
        url: item.url,
        thumbnail: item.thumbnail,
      }));

      // Merge direct documents with content items
      setDocuments([...directDocs, ...contentAsDocs]);

      // Load project conversations
      const savedConvs = localStorage.getItem(`moonscribe-project-${projectId}-conversations`);
      if (savedConvs) {
        setConversations(JSON.parse(savedConvs).map((c: any) => ({
          ...c,
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        })));
      }

      // Load API keys
      setApiKeys(getStoredApiKeys(user?.id || null));
    } catch (e) {
      console.error('Failed to load project data:', e);
    }
  }, [isMounted, projectId, router, user]);

  // Listen for API key changes and reload
  useEffect(() => {
    const handleApiKeyChange = () => {
      setApiKeys(getStoredApiKeys(user?.id || null));
    };
    window.addEventListener('moonscribe-api-keys-changed', handleApiKeyChange);
    return () => window.removeEventListener('moonscribe-api-keys-changed', handleApiKeyChange);
  }, [user]);

  // Save documents
  useEffect(() => {
    if (!isMounted || !projectId) return;
    localStorage.setItem(`moonscribe-project-${projectId}-documents`, JSON.stringify(documents));
    updateProjectStats();
  }, [documents, isMounted, projectId]);

  // Save conversations
  useEffect(() => {
    if (!isMounted || !projectId) return;
    localStorage.setItem(`moonscribe-project-${projectId}-conversations`, JSON.stringify(conversations));
    updateProjectStats();
  }, [conversations, isMounted, projectId]);

  const updateProjectStats = () => {
    if (!projectId) return;
    try {
      const savedProjects = localStorage.getItem('moonscribe-projects');
      if (savedProjects) {
        const projects = JSON.parse(savedProjects);
        const updated = projects.map((p: any) => 
          p.id === projectId 
            ? { ...p, documentCount: documents.length, conversationCount: conversations.length, updatedAt: new Date() }
            : p
        );
        localStorage.setItem('moonscribe-projects', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Failed to update project stats:', e);
    }
  };

  // Check if user has BYOK (any active key) - check for the selected provider first, then any provider
  // Also check localStorage directly in case state hasn't updated yet
  const hasApiKeyForProvider = apiKeys.some(k => k.provider === provider && k.isActive);
  const hasAnyApiKey = apiKeys.some(k => k.isActive);
  
  // Double-check by reading from localStorage directly (more reliable)
  const checkBYOKDirectly = () => {
    if (typeof window === 'undefined') return false;
    try {
      const keys = getStoredApiKeys(user?.id || null);
      return keys.some(k => k.isActive);
    } catch {
      return false;
    }
  };
  
  // For display purposes, show BYOK if any key is active (not just for selected provider)
  // This is because OpenAI key can be used for other providers too
  const isUsingBYOK = hasAnyApiKey || checkBYOKDirectly();

  // Handlers
  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setStatus('Uploading...');

    // Get API key for upload
    const apiKey = await getDecryptedApiKey('openai', user?.id || null);

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      if (apiKey) {
        formData.append('apiKey', apiKey);
      }

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
          const newDoc: Document = {
            id: `doc-${Date.now()}`,
            name: data.filename,
            status: 'ready',
            chunks: data.chunks,
            uploadedAt: new Date(),
          };
          setDocuments(prev => [...prev, newDoc]);
          setStatus(`Uploaded ${data.filename}`);
        } else {
          setStatus(`Error: ${data.error}`);
        }
      } catch (error: any) {
        setStatus(`Error: ${error.message}`);
      }
    }

    setIsUploading(false);
    setTimeout(() => setStatus(''), 3000);
  };

  const handleDeleteDocument = async (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    try {
      // If it's a PDF document, delete from Pinecone via API
      if (!doc.type || doc.type === 'document') {
        const res = await fetch('/api/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: doc.name }),
        });
        const data = await res.json();
        if (!data.success) {
          setStatus(`Error: ${data.error}`);
          return;
        }
      }

      // Remove from documents state
      setDocuments(prev => prev.filter(d => d.id !== id));

      // Also remove from project content storage
      const savedContent = localStorage.getItem(`moonscribe-project-content-${projectId}`);
      if (savedContent) {
        const content = JSON.parse(savedContent);
        const updated = content.filter((item: any) => item.id !== id);
        localStorage.setItem(`moonscribe-project-content-${projectId}`, JSON.stringify(updated));
      }

      // Also remove from direct documents storage
      const savedDocs = localStorage.getItem(`moonscribe-project-${projectId}-documents`);
      if (savedDocs) {
        const docs = JSON.parse(savedDocs);
        const updated = docs.filter((d: any) => d.id !== id);
        localStorage.setItem(`moonscribe-project-${projectId}-documents`, JSON.stringify(updated));
      }

      setStatus(`Deleted ${doc.name}`);
      setTimeout(() => setStatus(''), 3000);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleSendMessage = async (content: string) => {
    // Check guest limits before making API call
    if (!user) {
      // Guest user - check if they can perform the action
      if (!canGuestPerformAction('query')) {
        setShowSignUpRequired(true);
        return;
      }
    }

    setIsAsking(true);

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const userApiKey = await getDecryptedApiKey(provider as Provider, user?.id || null);

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: content,
          sourceFilenames: documents.map(d => d.name),
          apiKey: userApiKey || undefined,
          provider,
          model,
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.answer || `Error: ${data.error}`,
        sources: data.sources,
        timestamp: new Date(),
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Record guest usage after successful query
      if (!user && data.answer && !data.error) {
        recordGuestAction('query');
      }

      const convTitle = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      if (currentConversationId) {
        setConversations(prev =>
          prev.map(c =>
            c.id === currentConversationId
              ? { ...c, messages: updatedMessages, updatedAt: new Date() }
              : c
          )
        );
      } else {
        const newConv: Conversation = {
          id: `conv-${Date.now()}`,
          title: convTitle,
          messages: updatedMessages,
          updatedAt: new Date(),
        };
        setConversations(prev => [...prev, newConv]);
        setCurrentConversationId(newConv.id);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages([...newMessages, errorMessage]);
    }

    setIsAsking(false);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setCurrentConversationId(id);
      setMessages(conv.messages);
    }
  };

  const handleDeleteConversation = (id: string) => {
    if (confirm('Delete this conversation?')) {
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
        handleNewConversation();
      }
    }
  };

  if (!project) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f23 50%, #1a1a2e 100%)',
        color: '#94a3b8',
      }}>
        Loading project...
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f23 50%, #1a1a2e 100%)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        height: '64px',
        padding: '0 1.5rem',
        background: 'rgba(15, 15, 35, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.push('/app/projects')}
            style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              color: '#c4b5fd',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            ← Back
          </button>
          
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: `${project.color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.125rem',
          }}>
            📁
          </div>
          
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
              {project.name}
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
              {documents.length} documents • {conversations.length} conversations
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {status && (
            <Badge variant={status.includes('Error') ? 'error' : 'success'}>
              {status}
            </Badge>
          )}
          <Button variant="secondary" size="sm" onClick={handleNewConversation}>
            + New Chat
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            ⚙️
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Left Toggle */}
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          style={{
            position: 'fixed',
            left: leftPanelOpen ? '300px' : '0',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1000,
            width: '28px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '0 10px 10px 0',
            cursor: 'pointer',
            color: '#8b5cf6',
            fontSize: '0.875rem',
            transition: 'all 0.3s ease',
          }}
        >
          {leftPanelOpen ? '◀' : '▶'}
        </button>

        {/* Right Toggle */}
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          style={{
            position: 'fixed',
            right: rightPanelOpen ? '280px' : '0',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1000,
            width: '28px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '10px 0 0 10px',
            cursor: 'pointer',
            color: '#8b5cf6',
            fontSize: '0.875rem',
            transition: 'all 0.3s ease',
          }}
        >
          {rightPanelOpen ? '▶' : '◀'}
        </button>

        {/* Left Panel - Sources */}
        <div style={{
          width: leftPanelOpen ? '300px' : '0',
          minWidth: leftPanelOpen ? '300px' : '0',
          height: '100%',
          background: 'rgba(15, 15, 35, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRight: leftPanelOpen ? '1px solid rgba(139, 92, 246, 0.15)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          overflow: 'hidden',
        }}>
          {leftPanelOpen && (
            <SourcesPanel
              documents={documents}
              onUpload={handleUpload}
              onDelete={handleDeleteDocument}
              isUploading={isUploading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onAddContent={() => {
                // Trigger the global FAB click which will open modal with correct project
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('moonscribe-open-add-content'));
                }
              }}
              projectId={projectId}
            />
          )}
        </div>

        {/* Center - Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isAsking}
            provider={provider}
            model={model}
            onProviderChange={(p) => {
              setProvider(p);
              setModel(modelsByProvider[p]?.[0]?.value || '');
            }}
            onModelChange={setModel}
            availableModels={modelsByProvider[provider] || []}
            documentCount={documents.length}
            hasApiKey={isUsingBYOK}
          />
        </div>

        {/* Right Panel - History */}
        <div style={{
          width: rightPanelOpen ? '280px' : '0',
          minWidth: rightPanelOpen ? '280px' : '0',
          height: '100%',
          background: 'rgba(15, 15, 35, 0.6)',
          backdropFilter: 'blur(20px)',
          borderLeft: rightPanelOpen ? '1px solid rgba(139, 92, 246, 0.15)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          overflow: 'hidden',
        }}>
          {rightPanelOpen && (
            <HistoryPanel
              conversations={conversations.map(c => ({
                id: c.id,
                title: c.title,
                messageCount: c.messages.length,
                updatedAt: c.updatedAt,
              }))}
              currentConversationId={currentConversationId || undefined}
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onNewConversation={handleNewConversation}
            />
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKeys={apiKeys.map(k => ({
          id: k.id,
          provider: k.provider,
          name: k.keyName,
          isActive: k.isActive,
          createdAt: new Date(k.createdAt),
        }))}
        onAddKey={async (provider, name, key) => {
          const { saveApiKey } = await import('@/lib/utils/api-keys');
          await saveApiKey(provider as Provider, name, key, user?.id || null);
          setApiKeys(getStoredApiKeys(user?.id || null));
        }}
        onDeleteKey={async (id) => {
          const { deleteApiKey } = await import('@/lib/utils/api-keys');
          deleteApiKey(id, user?.id || null);
          setApiKeys(getStoredApiKeys(user?.id || null));
        }}
        onToggleKey={async (id) => {
          const { toggleApiKey } = await import('@/lib/utils/api-keys');
          toggleApiKey(id, user?.id || null);
          setApiKeys(getStoredApiKeys(user?.id || null));
        }}
        onTestKey={async (id) => {
          // Testing encrypted keys requires decryption - placeholder for now
          console.log('Testing key:', id);
          return true;
        }}
      />

      {/* Sign Up Required Modal (for guests who hit limit) */}
      <SignUpRequiredModal
        isOpen={showSignUpRequired}
        onClose={() => setShowSignUpRequired(false)}
        queriesUsed={getGuestUsage().queriesUsed}
        queryLimit={getGuestLimit()}
      />
    </div>
  );
}
