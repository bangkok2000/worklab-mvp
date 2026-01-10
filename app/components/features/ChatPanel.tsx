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
              <MessageBubble key={msg.id} message={msg} />
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
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
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
      </div>
      <span style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem', padding: '0 0.25rem' }}>
        {message.timestamp.toLocaleTimeString()}
      </span>
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
