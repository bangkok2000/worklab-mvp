'use client';

import React, { useState } from 'react';
import { EmptyState, Button, Badge } from '../ui';

interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  preview?: string;
}

interface HistoryPanelProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
}

export default function HistoryPanel({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}: HistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by createdAt (latest first), fallback to updatedAt if createdAt is not available
  const sortedConversations = [...filteredConversations].sort(
    (a, b) => {
      const aTime = a.createdAt?.getTime() || a.updatedAt.getTime();
      const bTime = b.createdAt?.getTime() || b.updatedAt.getTime();
      return bTime - aTime; // Latest first
    }
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    // Format time as HH:MM
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    // Format date
    if (days === 0) {
      if (minutes < 1) return 'Just now';
      if (hours < 1) return `${minutes}m ago`;
      return `Today ${timeStr}`;
    }
    if (days === 1) return `Yesterday ${timeStr}`;
    if (days < 7) return `${days}d ago ${timeStr}`;
    
    // For older dates, show full date and time
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
    return `${dateStr} ${timeStr}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search & New Chat */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
        <Button variant="primary" fullWidth onClick={onNewConversation} leftIcon={<span>+</span>}>
          New Conversation
        </Button>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            color: '#f1f5f9',
            outline: 'none',
          }}
        />
      </div>

      {/* Conversations List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
        {sortedConversations.length === 0 ? (
          <EmptyState
            icon="📜"
            title={searchQuery ? 'No matches' : 'No conversations'}
            description={searchQuery ? 'Try a different search' : 'Start a new conversation to see it here'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedConversations.map((conv) => (
              <ConversationCard
                key={conv.id}
                conversation={conv}
                isActive={conv.id === currentConversationId}
                onSelect={() => onSelectConversation(conv.id)}
                onDelete={() => onDeleteConversation(conv.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {conversations.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid rgba(139, 92, 246, 0.15)',
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// Conversation Card component
function ConversationCard({
  conversation,
  isActive,
  onSelect,
  onDelete,
  formatDate,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  formatDate: (date: Date) => string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '0.875rem 1rem',
        background: isActive ? 'rgba(139, 92, 246, 0.2)' : isHovered ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.06)',
        border: `1px solid ${isActive ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.15)'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      {/* Active indicator */}
      {isActive && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3px',
            height: '60%',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#f1f5f9',
              margin: 0,
              marginBottom: '0.25rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {conversation.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
              {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>•</span>
            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
              {formatDate(conversation.createdAt || conversation.updatedAt)}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            padding: '0.25rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: '1.125rem',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
        >
          ×
        </button>
      </div>
    </div>
  );
}
