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
  createdAt: Date;
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

      // Load all project content from unified Sources location
      const savedContent = localStorage.getItem(`moonscribe-project-content-${projectId}`);
      let allContent = savedContent ? JSON.parse(savedContent) : [];
      
      // Migrate old PDFs from separate documents storage to unified Sources
      const savedDocs = localStorage.getItem(`moonscribe-project-${projectId}-documents`);
      if (savedDocs) {
        const oldDocs = JSON.parse(savedDocs);
        const migratedContent = oldDocs.map((doc: any) => ({
          id: doc.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: doc.type || 'document',
          title: doc.name,
          filename: doc.name,
          chunksProcessed: doc.chunks || 0,
          processed: doc.status === 'ready',
          addedAt: doc.uploadedAt || new Date().toISOString(),
        }));
        
        // Merge migrated content with existing content
        allContent = [...migratedContent, ...allContent];
        
        // Save back to unified location
        localStorage.setItem(`moonscribe-project-content-${projectId}`, JSON.stringify(allContent));
        
        // Clear old documents storage (optional - keeping for backward compatibility)
        // localStorage.removeItem(`moonscribe-project-${projectId}-documents`);
      }
      
      console.log('[Project] All content from Sources:', allContent);
      
      // Convert all content to document format for display
      const contentAsDocs = allContent.map((item: any) => ({
        id: item.id,
        name: item.title || item.name || item.filename || 'Untitled',
        status: item.processed ? 'ready' as const : 'processing' as const,
        chunks: item.chunksProcessed || item.chunks || 0,
        uploadedAt: item.addedAt ? new Date(item.addedAt) : undefined,
        type: item.type || 'document', // Store original type for display
        url: item.url,
        thumbnail: item.thumbnail,
        // Preserve additional metadata
        ...(item.fileType && { fileType: item.fileType }),
        ...(item.fileSize && { fileSize: item.fileSize }),
        ...(item.analysis && { analysis: item.analysis }),
        ...(item.extractedText !== undefined && { extractedText: item.extractedText }),
        ...(item.duration && { duration: item.duration }),
        ...(item.durationMinutes && { durationMinutes: item.durationMinutes }),
      }));

      // Deduplicate by name
      const seen = new Set<string>();
      const mergedDocs = contentAsDocs.filter(doc => {
        const key = doc.name.toLowerCase().trim();
        if (seen.has(key)) {
          console.warn('[Project] Duplicate document found:', doc.name);
          return false;
        }
        seen.add(key);
        return true;
      });
      console.log('[Project] Merged documents (deduplicated):', mergedDocs);
      setDocuments(mergedDocs);

      // Load project conversations
      const savedConvs = localStorage.getItem(`moonscribe-project-${projectId}-conversations`);
      if (savedConvs) {
        setConversations(JSON.parse(savedConvs).map((c: any) => ({
          ...c,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(c.updatedAt), // Fallback to updatedAt for old conversations
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

  // Listen for content added events and reload documents
  useEffect(() => {
    if (!isMounted || !projectId) return;
    
    const handleContentAdded = () => {
      // Reload all content from unified Sources location
      const savedContent = localStorage.getItem(`moonscribe-project-content-${projectId}`);
      const allContent = savedContent ? JSON.parse(savedContent) : [];
      
      const contentAsDocs = allContent.map((item: any) => ({
        id: item.id,
        name: item.title || item.name || item.filename || 'Untitled',
        status: item.processed ? 'ready' as const : 'processing' as const,
        chunks: item.chunksProcessed || item.chunks || 0,
        uploadedAt: item.addedAt ? new Date(item.addedAt) : undefined,
        type: item.type || 'document',
        url: item.url,
        thumbnail: item.thumbnail,
        // Preserve additional metadata
        ...(item.fileType && { fileType: item.fileType }),
        ...(item.fileSize && { fileSize: item.fileSize }),
        ...(item.analysis && { analysis: item.analysis }),
        ...(item.extractedText !== undefined && { extractedText: item.extractedText }),
        ...(item.duration && { duration: item.duration }),
        ...(item.durationMinutes && { durationMinutes: item.durationMinutes }),
      }));

      const seen = new Set<string>();
      const mergedDocs = contentAsDocs.filter(doc => {
        const key = doc.name.toLowerCase().trim();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      setDocuments(mergedDocs);
    };
    
    window.addEventListener('moonscribe-content-added', handleContentAdded);
    return () => window.removeEventListener('moonscribe-content-added', handleContentAdded);
  }, [isMounted, projectId]);

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

  // Sync documents state to unified Sources location (for backward compatibility)
  useEffect(() => {
    if (!isMounted || !projectId) return;
    
    // Update unified Sources location with current documents state
    // This ensures UI state stays in sync with storage
    const savedContent = localStorage.getItem(`moonscribe-project-content-${projectId}`);
    const existingContent = savedContent ? JSON.parse(savedContent) : [];
    
    // Create a map of existing content by ID for quick lookup
    const contentMap = new Map(existingContent.map((item: any) => [item.id, item]));
    
    // Update or add documents from state
    documents.forEach(doc => {
      const existingItem = contentMap.get(doc.id);
      if (existingItem) {
        // Update existing item
        Object.assign(existingItem, {
          title: doc.name,
          filename: doc.name,
          chunksProcessed: doc.chunks || 0,
          processed: doc.status === 'ready',
          type: doc.type || 'document',
          ...(doc.url && { url: doc.url }),
          ...(doc.thumbnail && { thumbnail: doc.thumbnail }),
        });
      } else {
        // Add new item
        existingContent.push({
          id: doc.id,
          type: doc.type || 'document',
          title: doc.name,
          filename: doc.name,
          chunksProcessed: doc.chunks || 0,
          processed: doc.status === 'ready',
          addedAt: doc.uploadedAt ? doc.uploadedAt.toISOString() : new Date().toISOString(),
          ...(doc.url && { url: doc.url }),
          ...(doc.thumbnail && { thumbnail: doc.thumbnail }),
        });
      }
    });
    
    // Remove items that are no longer in documents state
    const documentIds = new Set(documents.map(d => d.id));
    const filteredContent = existingContent.filter((item: any) => documentIds.has(item.id));
    
    localStorage.setItem(`moonscribe-project-content-${projectId}`, JSON.stringify(filteredContent));
    updateProjectStats();
  }, [documents, isMounted, projectId]);

  // Save conversations
  useEffect(() => {
    if (!isMounted || !projectId) return;
    localStorage.setItem(`moonscribe-project-${projectId}-conversations`, JSON.stringify(conversations));
    updateProjectStats();
  }, [conversations, isMounted, projectId]);

  // Check if user has BYOK (any active key) - reactive check
  const [isUsingBYOK, setIsUsingBYOK] = useState(false);
  
  useEffect(() => {
    const checkBYOK = () => {
      if (typeof window === 'undefined') {
        setIsUsingBYOK(false);
        return;
      }
      try {
        // Check user-specific keys first
        const userKeys = getStoredApiKeys(user?.id || null);
        let hasActive = userKeys.some(k => k.isActive);
        
        // Also check anonymous keys as fallback (in case user logged in but keys are still in anonymous storage)
        if (!hasActive) {
          const anonymousKeys = getStoredApiKeys(null);
          hasActive = anonymousKeys.some(k => k.isActive);
        }
        
        setIsUsingBYOK(hasActive);
      } catch (error) {
        console.error('Error checking BYOK:', error);
        setIsUsingBYOK(false);
      }
    };
    
    // Check immediately
    checkBYOK();
    
    // Listen for API key changes
    window.addEventListener('moonscribe-api-keys-changed', checkBYOK);
    window.addEventListener('storage', checkBYOK); // Also listen for cross-tab changes
    
    return () => {
      window.removeEventListener('moonscribe-api-keys-changed', checkBYOK);
      window.removeEventListener('storage', checkBYOK);
    };
  }, [user]);

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
        // Detect file type and route to appropriate endpoint
        const isImage = file.type.startsWith('image/');
        const isAudio = file.type.startsWith('audio/') || 
                       file.name.toLowerCase().endsWith('.mp3') ||
                       file.name.toLowerCase().endsWith('.wav') ||
                       file.name.toLowerCase().endsWith('.m4a');
        
        let endpoint = '/api/upload';
        if (isImage) {
          endpoint = '/api/image';
        } else if (isAudio) {
          endpoint = '/api/audio';
        }
        
        const res = await fetch(endpoint, { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
          const contentId = isImage ? (data.imageId || `image-${Date.now()}`) 
                : isAudio ? (data.audioId || `audio-${Date.now()}`)
                : `doc-${Date.now()}`;
          
          // Create content item in unified format
          const newContentItem = {
            id: contentId,
            type: isImage ? 'image' : isAudio ? 'audio' : 'document',
            title: data.filename,
            filename: data.filename,
            chunksProcessed: isImage ? 1 : (data.chunks || 0),
            processed: true,
            addedAt: new Date().toISOString(),
            ...(isImage && {
              fileType: data.fileType,
              fileSize: data.fileSize,
              analysis: data.analysis,
              extractedText: data.extractedText,
            }),
            ...(isAudio && {
              fileType: data.fileType,
              fileSize: data.fileSize,
              transcript: data.transcript,
              duration: data.duration,
              durationMinutes: data.durationMinutes,
            }),
          };

          // Save to unified Sources location
          const savedContent = localStorage.getItem(`moonscribe-project-content-${projectId}`);
          const content = savedContent ? JSON.parse(savedContent) : [];
          
          // Check for duplicates
          const exists = content.some((item: any) => 
            (item.title || item.filename || '').toLowerCase().trim() === data.filename.toLowerCase().trim()
          );
          
          if (!exists) {
            content.unshift(newContentItem);
            localStorage.setItem(`moonscribe-project-content-${projectId}`, JSON.stringify(content));
            
            // Also update documents state for UI
            const newDoc: Document = {
              id: contentId,
              name: data.filename,
              status: 'ready',
              chunks: isImage ? 1 : (data.chunks || 0),
              uploadedAt: new Date(),
              type: isImage ? 'image' : isAudio ? 'audio' : 'document',
              ...(isImage && {
                fileType: data.fileType,
                fileSize: data.fileSize,
                analysis: data.analysis,
                extractedText: data.extractedText,
              }),
              ...(isAudio && {
                fileType: data.fileType,
                fileSize: data.fileSize,
                transcript: data.transcript,
                duration: data.duration,
                durationMinutes: data.durationMinutes,
              }),
            };
            
            setDocuments(prev => [...prev, newDoc]);
            
            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('moonscribe-content-added', { detail: newContentItem }));
          } else {
            console.warn('[Project] Document already exists, skipping:', data.filename);
          }
          
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

      // Remove from unified Sources location
      const savedContent = localStorage.getItem(`moonscribe-project-content-${projectId}`);
      if (savedContent) {
        const content = JSON.parse(savedContent);
        const updated = content.filter((item: any) => item.id !== id);
        localStorage.setItem(`moonscribe-project-content-${projectId}`, JSON.stringify(updated));
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

      // Only include ready/processed documents in the search
      const readyDocuments = documents.filter(d => d.status === 'ready');
      
      // For web content, use the title as stored (which matches Pinecone source field)
      // For PDFs, use the filename
      const sourceFilenames = readyDocuments.map(d => {
        // Web content: use title (matches Pinecone 'source' field)
        // PDFs: use name (filename)
        return d.name;
      });
      
      // Debug logging
      console.log('[Project] Documents in state:', documents);
      console.log('[Project] Ready documents:', readyDocuments);
      console.log('[Project] Sending sourceFilenames to API:', sourceFilenames);
      
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: content,
          sourceFilenames: sourceFilenames,
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
        const now = new Date();
        const newConv: Conversation = {
          id: `conv-${Date.now()}`,
          title: convTitle,
          messages: updatedMessages,
          createdAt: now,
          updatedAt: now,
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
              {documents.filter(d => d.status === 'ready').length} ready • {documents.length} total • {conversations.length} conversations
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
            // Sidebar is 260px, Sources panel is 300px when open, 0px when closed
            // Button's right edge should align with left edge of main content (second column)
            // When Sources open: 260px (sidebar) + 300px (sources) - 28px (button width) = 532px
            // When Sources closed: 260px (sidebar) + 0px - 28px = 232px
            left: leftPanelOpen ? '532px' : '232px',
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
            projectId={projectId}
            projectName={project?.name}
            projectColor={project?.color}
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
                createdAt: c.createdAt,
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
