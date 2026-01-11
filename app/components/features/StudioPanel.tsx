'use client';

import React, { useState } from 'react';
import ChatPanel from './ChatPanel';
import FlashcardsPanel from './study/FlashcardsPanel';
// import QuizPanel from './study/QuizPanel';
// import SummaryPanel from './study/SummaryPanel';
// import StudyGuidePanel from './study/StudyGuidePanel';
// import MindMapPanel from './study/MindMapPanel';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { 
    number: number; 
    source: string; 
    relevance?: number;
    timestamp?: number;
    timestampFormatted?: string;
    audioId?: string;
  }[];
  timestamp: Date;
}

interface StudioPanelProps {
  // Chat props
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
  // Study tools props
  sourceFilenames?: string[];
}

type StudioTab = 'chat' | 'summary' | 'flashcards' | 'quiz' | 'mind-map' | 'study-guide';

const tabs: { id: StudioTab; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'summary', label: 'Summary', icon: '📝' },
  { id: 'flashcards', label: 'Flashcards', icon: '🎴' },
  { id: 'quiz', label: 'Quiz', icon: '❓' },
  { id: 'mind-map', label: 'Mind Map', icon: '🧠' },
  { id: 'study-guide', label: 'Study Guide', icon: '📚' },
];

export default function StudioPanel({
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
  sourceFilenames = [],
}: StudioPanelProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('chat');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', position: 'relative' }}>
      {/* Tab Navigation - Sticky */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
        background: 'rgba(15, 15, 35, 0.95)',
        backdropFilter: 'blur(20px)',
        overflowX: 'auto',
        position: 'sticky',
        top: '64px', // Account for project page header height
        zIndex: 200,
        flexShrink: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: activeTab === tab.id ? '#c4b5fd' : '#94a3b8',
              fontSize: '0.8125rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'chat' && (
          <ChatPanel
            messages={messages}
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            provider={provider}
            model={model}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
            availableModels={availableModels}
            documentCount={documentCount}
            hasApiKey={hasApiKey}
            projectId={projectId}
            projectName={projectName}
            projectColor={projectColor}
          />
        )}
        
        {activeTab === 'summary' && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            color: '#94a3b8',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                Summary
              </h3>
              <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                Generate summaries from your documents
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Coming soon...
              </p>
            </div>
          </div>
        )}

        {activeTab === 'flashcards' && projectId && (
          <FlashcardsPanel
            projectId={projectId}
            sourceFilenames={sourceFilenames}
            provider={provider}
            model={model}
          />
        )}

        {activeTab === 'quiz' && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            color: '#94a3b8',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❓</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                Quiz
              </h3>
              <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                Test your knowledge with interactive quizzes
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Coming soon...
              </p>
            </div>
          </div>
        )}

        {activeTab === 'mind-map' && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            color: '#94a3b8',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                Mind Map
              </h3>
              <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                Visualize concept relationships
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Coming soon...
              </p>
            </div>
          </div>
        )}

        {activeTab === 'study-guide' && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            color: '#94a3b8',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                Study Guide
              </h3>
              <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                Structured learning materials
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Coming soon...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
