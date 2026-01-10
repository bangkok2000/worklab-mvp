'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Select, EmptyState } from '../ui';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { number: number; source: string; relevance?: number }[];
  timestamp: Date;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  provider?: string;
  model?: string;
  onProviderChange?: (provider: string) => void;
  onModelChange?: (model: string) => void;
  availableModels?: { value: string; label: string }[];
  documentCount?: number;
  hasApiKey?: boolean;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
}

const providers = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'ollama', label: 'Ollama' },
];

export default function ChatPanel({
  messages,
  onSendMessage,
  isLoading = false,
  provider = 'openai',
  model = 'gpt-3.5-turbo',
  onProviderChange,
  onModelChange,
  availableModels = [{ value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' }],
  documentCount = 0,
  hasApiKey = false,
  projectId,
  projectName,
  projectColor,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(10, 10, 25, 0.4)' }}>
      {/* Messages Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        {messages.length === 0 ? (
          <EmptyState
            icon="💬"
            title="Start a conversation"
            description="Ask questions about your uploaded documents to get AI-powered insights"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg}
                projectId={projectId}
                projectName={projectName}
                projectColor={projectColor}
                allMessages={messages}
              />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(139, 92, 246, 0.15)',
          background: 'rgba(15, 15, 35, 0.5)',
        }}
      >
        {/* Provider/Model Selection */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ width: '140px' }}>
            <Select
              options={providers}
              value={provider}
              onChange={(e) => onProviderChange?.(e.target.value)}
              size="sm"
            />
          </div>
          <div style={{ flex: 1 }}>
            <Select
              options={availableModels}
              value={model}
              onChange={(e) => onModelChange?.(e.target.value)}
              size="sm"
            />
          </div>
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            rows={1}
            style={{
              flex: 1,
              padding: '0.875rem 1rem',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '12px',
              fontSize: '0.9375rem',
              color: '#f1f5f9',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              minHeight: '52px',
              maxHeight: '150px',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            isLoading={isLoading}
          >
            Send
          </Button>
        </div>

        {/* Status bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.625rem',
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          {documentCount > 0 && (
            <span>Searching in {documentCount} document{documentCount !== 1 ? 's' : ''}</span>
          )}
          <span style={{ color: hasApiKey ? '#10b981' : '#f59e0b' }}>
            {hasApiKey ? `✓ Using your ${provider} key` : '⚠ Using server key (credits)'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Message Bubble component
function MessageBubble({ 
  message, 
  projectId, 
  projectName, 
  projectColor 
}: { 
  message: Message;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
}) {
  const isUser = message.role === 'user';
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Find the user's question that prompted this AI response
  const userQuestion = message.sources ? '' : ''; // We'll get this from context

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        <div
          style={{
            maxWidth: '75%',
            padding: '1rem 1.25rem',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: isUser
              ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
              : 'rgba(139, 92, 246, 0.1)',
            color: isUser ? '#ffffff' : '#f1f5f9',
            border: isUser ? 'none' : '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: isUser ? '0 4px 15px rgba(139, 92, 246, 0.3)' : 'none',
            position: 'relative',
          }}
        >
          <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: '0.9375rem' }}>
            {message.content}
          </p>

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <div
              style={{
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b5cf6', marginBottom: '0.5rem' }}>
                Sources ({message.sources.length}):
              </p>
              {message.sources.map((source) => (
                <p key={source.number} style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0' }}>
                  [{source.number}] {source.source}
                  {source.relevance && (
                    <span style={{ opacity: 0.7, marginLeft: '0.25rem' }}>
                      ({source.relevance}%)
                    </span>
                  )}
                </p>
              ))}
            </div>
          )}

          {/* Save as Insight button (only for AI responses) */}
          {!isUser && (
            <button
              onClick={() => setShowSaveModal(true)}
              style={{
                marginTop: '0.75rem',
                padding: '0.5rem 0.875rem',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                color: '#c4b5fd',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
              }}
            >
              💡 Save as Insight
            </button>
          )}
        </div>
        <span style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem', padding: '0 0.25rem' }}>
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>

      {/* Save Insight Modal */}
      {showSaveModal && (
        <SaveInsightModal
          message={message}
          userQuestion={userQuestion}
          projectId={projectId}
          projectName={projectName}
          projectColor={projectColor}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </>
  );
}

// Save Insight Modal Component
function SaveInsightModal({
  message,
  projectId,
  projectName,
  projectColor,
  onClose,
}: {
  message: Message;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-generate title from first line of content
  useEffect(() => {
    if (!title && message.content) {
      const firstLine = message.content.split('\n')[0].trim();
      setTitle(firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine);
    }
  }, [message.content, title]);

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSaving(true);

    try {
      // Get existing insights
      const STORAGE_KEY = 'moonscribe_insights_v2';
      const saved = localStorage.getItem(STORAGE_KEY);
      let insights: any[] = [];

      if (saved) {
        const data = JSON.parse(saved);
        if (data.insights) {
          insights = data.insights;
        }
      }

      // Get all projects for project selection
      const projectsData = localStorage.getItem('moonscribe-projects');
      const projects = projectsData ? JSON.parse(projectsData) : [];
      const selectedProject = projects.find((p: any) => p.id === projectId);

      // Create new insight
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const newInsight = {
        id: `insight-${Date.now()}`,
        title: title.trim(),
        originalQuery: userQuestion || 'Question about documents',
        content: message.content,
        sources: (message.sources || []).map((s, idx) => ({
          id: `source-${idx}`,
          title: s.source,
          type: 'document', // Default type
          relevance: s.relevance,
        })),
        tags,
        projectId: projectId || undefined,
        projectName: selectedProject?.name || projectName || undefined,
        projectColor: selectedProject?.color || projectColor || undefined,
        isStarred: false,
        isPublic: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to insights array
      insights.unshift(newInsight);

      // Save back to localStorage
      const dataToSave = {
        version: 2,
        initialized: true,
        insights,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

      // Dispatch event to notify other pages
      window.dispatchEvent(new CustomEvent('moonscribe-insights-changed', {
        detail: { count: insights.filter((i: any) => !i.isArchived).length }
      }));

      alert('Insight saved!');
      onClose();
    } catch (error) {
      console.error('Failed to save insight:', error);
      alert('Failed to save insight. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>💡 Save as Insight</h2>
          <button
            onClick={onClose}
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

        {/* Form */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Title */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                color: '#94a3b8',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}
            >
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this insight..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                color: '#94a3b8',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}
            >
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="AI, Research, Notes"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Project Info (read-only) */}
          {projectName && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  color: '#94a3b8',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                }}
              >
                Project
              </label>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '8px',
                  color: '#c4b5fd',
                  fontSize: '0.875rem',
                }}
              >
                {projectName}
              </div>
            </div>
          )}

          {/* Preview */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                color: '#94a3b8',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}
            >
              Content Preview
            </label>
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '0.875rem',
                maxHeight: '150px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {message.content.substring(0, 200)}
              {message.content.length > 200 ? '...' : ''}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(139, 92, 246, 0.15)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'rgba(100, 116, 139, 0.1)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            style={{
              padding: '0.625rem 1.25rem',
              background: isSaving || !title.trim()
                ? 'rgba(139, 92, 246, 0.5)'
                : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.875rem',
              cursor: isSaving || !title.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            {isSaving ? 'Saving...' : 'Save Insight'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Typing Indicator component
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '16px 16px 16px 4px',
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#8b5cf6',
        }}
      >
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: '0.875rem' }}>Thinking...</span>
      </div>
    </div>
  );
}
