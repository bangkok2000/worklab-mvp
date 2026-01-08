'use client';

import { useState, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

export default function Home() {
  // Document management
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Chat
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Studio (for future features)
  const [studioView, setStudioView] = useState<'summary' | 'chat' | null>(null);
  
  // Panel visibility (for responsive)
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [centerPanelOpen, setCenterPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Load conversations from localStorage (temporary until auth)
  useEffect(() => {
    const saved = localStorage.getItem('moonscribe-conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const conversationsWithDates = parsed.map((conv: any) => ({
          ...conv,
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
        setConversations(conversationsWithDates);
      } catch (e) {
        console.error('Failed to load conversations', e);
      }
    }
  }, []);

  // Track if we've loaded from localStorage to avoid overwriting on initial render
  const [filesLoaded, setFilesLoaded] = useState(false);

  // Load uploaded files from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('moonscribe-uploaded-files');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setUploadedFiles(parsed);
        }
      } catch (e) {
        console.error('Failed to load uploaded files', e);
      }
    }
    setFilesLoaded(true);
  }, []);

  // Save uploaded files to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (filesLoaded && uploadedFiles.length >= 0) {
      localStorage.setItem('moonscribe-uploaded-files', JSON.stringify(uploadedFiles));
    }
  }, [uploadedFiles, filesLoaded]);

  // Save conversations to localStorage
  const saveConversations = (convs: Conversation[]) => {
    setConversations(convs);
    localStorage.setItem('moonscribe-conversations', JSON.stringify(convs));
  };

  // Save uploaded files to localStorage (redundant but ensures immediate save)
  const saveUploadedFiles = (files: string[]) => {
    if (filesLoaded) {
      localStorage.setItem('moonscribe-uploaded-files', JSON.stringify(files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadStatus('Uploading and processing...');

    let successCount = 0;
    let totalChunks = 0;
    const newFiles: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (data.success) {
          successCount++;
          totalChunks += data.chunks;
          newFiles.push(data.filename);
        } else {
          setUploadStatus(`✗ Error uploading ${file.name}: ${data.error}`);
          setUploading(false);
          return;
        }
      } catch (error: any) {
        setUploadStatus(`✗ Error uploading ${file.name}: ${error.message}`);
        setUploading(false);
        return;
      }
    }

    setUploadedFiles(prev => {
      const combined = [...prev, ...newFiles];
      const newList = Array.from(new Set(combined));
      // Save to localStorage
      saveUploadedFiles(newList);
      return newList;
    });

    setUploadStatus(`✓ Processed ${totalChunks} chunks from ${successCount} file(s)`);
    setUploading(false);
    setFiles([]);
    setTimeout(() => setUploadStatus(''), 5000);
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete "${filename}"?\n\nThis will remove all chunks from the database. This action cannot be undone.`)) {
      return;
    }

    setDeletingFile(filename);

    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      const data = await res.json();

      if (data.success) {
        setUploadedFiles(prev => {
          const updatedFiles = prev.filter(f => f !== filename);
          // Will be saved by useEffect
          return updatedFiles;
        });
        setUploadStatus(`✓ Deleted ${data.deletedCount} chunks from "${filename}"`);
        setTimeout(() => setUploadStatus(''), 3000);
      } else {
        setUploadStatus(`✗ Error: ${data.error}`);
      }
    } catch (error: any) {
      setUploadStatus(`✗ Error: ${error.message}`);
    } finally {
      setDeletingFile(null);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;

    setAsking(true);
    const userMessage: Message = {
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    // Add user message immediately
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setQuestion('');

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question,
          sourceFilenames: uploadedFiles.length > 0 ? uploadedFiles : undefined
        }),
      });

      const data = await res.json();

      if (data.answer) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          timestamp: new Date(),
        };
        
        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);

        // Update or create conversation
        if (currentConversation) {
          const updated = {
            ...currentConversation,
            messages: updatedMessages,
            updatedAt: new Date(),
          };
          setCurrentConversation(updated);
          // Update existing conversation or add if not in array
          const existingIndex = conversations.findIndex(c => c.id === updated.id);
          if (existingIndex >= 0) {
            const updatedConvs = [...conversations];
            updatedConvs[existingIndex] = updated;
            saveConversations(updatedConvs);
          } else {
            saveConversations([...conversations, updated]);
          }
        } else {
          const newConv: Conversation = {
            id: Date.now().toString(),
            title: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
            messages: updatedMessages,
            updatedAt: new Date(),
          };
          setCurrentConversation(newConv);
          saveConversations([...conversations, newConv]);
        }
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${data.error}`,
          timestamp: new Date(),
        };
        setMessages([...newMessages, errorMessage]);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setAsking(false);
    }
  };

  const startNewConversation = () => {
    // Save current conversation if it has messages
    if (currentConversation && messages.length > 0) {
      const updated = {
        ...currentConversation,
        messages: messages,
        updatedAt: new Date(),
      };
      // Update in conversations array
      const updatedConvs = conversations.map(c => 
        c.id === updated.id ? updated : c
      );
      // If conversation doesn't exist in array yet, add it
      if (!conversations.find(c => c.id === updated.id)) {
        updatedConvs.push(updated);
      }
      saveConversations(updatedConvs);
    } else if (messages.length > 0 && !currentConversation) {
      // If we have messages but no conversation, create one
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: messages[0]?.content?.substring(0, 50) + (messages[0]?.content?.length > 50 ? '...' : '') || 'New Conversation',
        messages: messages,
        updatedAt: new Date(),
      };
      saveConversations([...conversations, newConv]);
    }
    
    // Clear current conversation and start fresh
    setCurrentConversation(null);
    setMessages([]);
    setQuestion('');
  };

  const loadConversation = (conv: Conversation) => {
    setCurrentConversation(conv);
    setMessages(conv.messages);
  };

  const deleteConversation = (id: string) => {
    if (confirm('Delete this conversation?')) {
      const updated = conversations.filter(c => c.id !== id);
      saveConversations(updated);
      if (currentConversation?.id === id) {
        startNewConversation();
      }
    }
  };

  const filteredFiles = uploadedFiles.filter(f => 
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 600 }}>MoonScribe</h1>
          <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
            Upload PDFs and ask questions about them
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {uploadStatus && (
            <span style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: uploadStatus.startsWith('✓') ? '#d1fae5' : '#fee2e2',
              color: uploadStatus.startsWith('✓') ? '#065f46' : '#991b1b',
            }}>
              {uploadStatus}
            </span>
          )}
          <button
            onClick={() => {/* Settings - to be implemented */}}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      </header>

      {/* Three-Panel Layout */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        gap: '1px',
        backgroundColor: '#e0e0e0'
      }}>
        {/* Left Panel - Sources */}
        <div style={{
          width: leftPanelOpen ? '300px' : '0',
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s',
          overflow: 'hidden',
          borderRight: '1px solid #e0e0e0',
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 600 }}>📚 Sources</h2>
              <button
                onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}
              >
                {leftPanelOpen ? '◀' : '▶'}
              </button>
            </div>
            
            {/* Search */}
            <input
              type="text"
              placeholder="🔍 Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Upload Section */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              style={{
                display: 'block',
                padding: '10px',
                border: '2px dashed #ddd',
                borderRadius: '6px',
                textAlign: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#666',
                marginBottom: '8px',
              }}
            >
              {files.length > 0 ? `${files.length} file(s) selected` : '+ Add Document'}
            </label>
            {files.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: uploading ? '#ccc' : '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {uploading ? 'Processing...' : 'Upload & Process'}
              </button>
            )}
          </div>

          {/* Documents List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {filteredFiles.length === 0 ? (
              <p style={{ 
                padding: '20px', 
                textAlign: 'center', 
                color: '#999', 
                fontSize: '14px' 
              }}>
                {searchQuery ? 'No documents match your search' : 'No documents uploaded yet'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredFiles.map((filename, idx) => (
                  <div
                    key={idx}
                    data-filename={filename}
                    style={{
                      padding: '12px',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '6px',
                      border: '1px solid #e0e0e0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'background-color 0.3s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '14px', flex: 1, wordBreak: 'break-word', fontWeight: 500 }}>
                        📄 {filename}
                      </span>
                      <button
                        onClick={() => handleDelete(filename)}
                        disabled={deletingFile === filename}
                        style={{
                          padding: '4px 8px',
                          border: 'none',
                          background: 'none',
                          cursor: deletingFile === filename ? 'not-allowed' : 'pointer',
                          color: '#dc2626',
                          fontSize: '16px',
                          flexShrink: 0,
                        }}
                        title="Delete"
                      >
                        {deletingFile === filename ? '⏳' : '🗑️'}
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', display: 'flex', gap: '12px' }}>
                      <span>Ready</span>
                      <span>•</span>
                      <span>{uploadedFiles.indexOf(filename) + 1} of {uploadedFiles.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Panel - Studio/Chat */}
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Studio Header (for future tabs) */}
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 600 }}>💬 Chat</h2>
            {currentConversation && (
              <button
                onClick={startNewConversation}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                }}
              >
                + New Chat
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {messages.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#999', 
                marginTop: '40px' 
              }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>Start a conversation</p>
                <p style={{ fontSize: '14px' }}>
                  Ask questions about your uploaded documents
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: msg.role === 'user' ? '#0070f3' : '#f3f4f6',
                    color: msg.role === 'user' ? 'white' : '#1f2937',
                  }}>
                    <p style={{ margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{ 
                        marginTop: '12px', 
                        paddingTop: '12px', 
                        borderTop: `1px solid ${msg.role === 'user' ? 'rgba(255,255,255,0.2)' : '#e0e0e0'}`,
                      }}>
                        <p style={{ 
                          fontSize: '12px', 
                          fontWeight: 600, 
                          marginBottom: '8px',
                          opacity: 0.8,
                        }}>
                          Sources ({msg.sources.length}):
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {msg.sources.map((source: any) => (
                            <button
                              key={source.number}
                              onClick={() => {
                                // Scroll to document in left panel
                                const docElement = document.querySelector(`[data-filename="${source.source}"]`);
                                if (docElement) {
                                  docElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  // Highlight briefly
                                  (docElement as HTMLElement).style.backgroundColor = '#fef3c7';
                                  setTimeout(() => {
                                    (docElement as HTMLElement).style.backgroundColor = '';
                                  }, 2000);
                                }
                              }}
                              style={{ 
                                fontSize: '12px',
                                opacity: 0.9,
                                textAlign: 'left',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px 0',
                                color: 'inherit',
                                textDecoration: 'underline',
                                textDecorationStyle: 'dotted',
                              }}
                              title={`Click to find "${source.source}" in documents`}
                            >
                              [{source.number}] {source.source}
                              <span style={{ opacity: 0.7, marginLeft: '4px' }}>
                                ({source.relevance}% relevant)
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{ 
                    fontSize: '11px', 
                    color: '#999', 
                    marginTop: '4px',
                    padding: '0 4px',
                  }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
            {asking && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#f3f4f6',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid #666',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}></span>
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ 
            padding: '16px', 
            borderTop: '1px solid #e0e0e0',
            backgroundColor: 'white',
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder="Ask a question about your documents..."
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '50px',
                  maxHeight: '120px',
                }}
                rows={1}
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || asking}
                style={{
                  padding: '12px 24px',
                  backgroundColor: (!question.trim() || asking) ? '#ccc' : '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!question.trim() || asking) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  alignSelf: 'flex-end',
                }}
              >
                {asking ? '⏳' : 'Send'}
              </button>
            </div>
            {uploadedFiles.length > 0 && (
              <p style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginTop: '8px',
                margin: '8px 0 0 0',
              }}>
                Searching in {uploadedFiles.length} document{uploadedFiles.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Right Panel - Chat History */}
        <div style={{
          width: rightPanelOpen ? '280px' : '0',
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s',
          overflow: 'hidden',
          borderLeft: '1px solid #e0e0e0',
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 600 }}>📜 History</h2>
              <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}
              >
                {rightPanelOpen ? '▶' : '◀'}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {conversations.length === 0 ? (
              <p style={{ 
                padding: '20px', 
                textAlign: 'center', 
                color: '#999', 
                fontSize: '14px' 
              }}>
                No conversations yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {conversations
                  .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                  .map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      style={{
                        padding: '12px',
                        backgroundColor: currentConversation?.id === conv.id ? '#f0f9ff' : '#f9f9f9',
                        borderRadius: '6px',
                        border: `1px solid ${currentConversation?.id === conv.id ? '#0070f3' : '#e0e0e0'}`,
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      <p style={{ 
                        fontSize: '14px', 
                        fontWeight: 500, 
                        margin: '0 0 4px 0',
                        wordBreak: 'break-word',
                      }}>
                        {conv.title}
                      </p>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#666', 
                        margin: 0 
                      }}>
                        {conv.messages.length} messages
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: '#999',
                          fontSize: '14px',
                          padding: '4px',
                        }}
                        title="Delete conversation"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
