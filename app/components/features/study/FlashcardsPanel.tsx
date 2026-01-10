'use client';

import React, { useState, useEffect } from 'react';
import { Button, EmptyState } from '../../ui';
import { getDecryptedApiKey, type Provider } from '@/lib/utils/api-keys';
import { useAuth } from '@/lib/auth';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  source: string;
  createdAt: Date;
}

interface FlashcardsPanelProps {
  projectId: string;
  sourceFilenames: string[];
  provider?: string;
  model?: string;
}

export default function FlashcardsPanel({
  projectId,
  sourceFilenames,
  provider = 'openai',
  model = 'gpt-3.5-turbo',
}: FlashcardsPanelProps) {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load flashcards from localStorage
  useEffect(() => {
    if (!projectId) return;
    
    try {
      const saved = localStorage.getItem(`moonscribe-project-${projectId}-flashcards`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFlashcards(parsed.map((f: any) => ({
          ...f,
          createdAt: new Date(f.createdAt),
        })));
      }
    } catch (error) {
      console.error('Failed to load flashcards:', error);
    }
  }, [projectId]);

  // Save flashcards to localStorage
  useEffect(() => {
    if (!projectId || flashcards.length === 0) return;
    
    try {
      localStorage.setItem(
        `moonscribe-project-${projectId}-flashcards`,
        JSON.stringify(flashcards)
      );
    } catch (error) {
      console.error('Failed to save flashcards:', error);
    }
  }, [flashcards, projectId]);

  const handleGenerate = async () => {
    if (sourceFilenames.length === 0) {
      setError('No documents available. Please add documents to generate flashcards.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const userApiKey = await getDecryptedApiKey(provider as Provider, user?.id || null);

      const res = await fetch('/api/study/flashcards', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(user && { 'Authorization': `Bearer ${user.id}` }),
        },
        body: JSON.stringify({
          sourceFilenames,
          apiKey: userApiKey || undefined,
          provider,
          model,
          count: 10, // Generate 10 flashcards
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate flashcards');
      }

      // Add new flashcards to existing ones (they are automatically saved via useEffect)
      setFlashcards(prev => {
        const updated = [...prev, ...data.flashcards];
        // Ensure flashcards are saved immediately after generation (like insights)
        // Save explicitly here to ensure persistence
        try {
          localStorage.setItem(
            `moonscribe-project-${projectId}-flashcards`,
            JSON.stringify(updated)
          );
        } catch (error) {
          console.error('Failed to save flashcards:', error);
        }
        return updated;
      });
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err: any) {
      setError(err.message || 'Failed to generate flashcards');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this flashcard?')) {
      setFlashcards(prev => {
        const filtered = prev.filter(f => f.id !== id);
        // Adjust current index if needed
        const deletedIndex = prev.findIndex(f => f.id === id);
        if (deletedIndex !== -1) {
          // If we deleted the last card, move to the new last card
          if (deletedIndex >= filtered.length && filtered.length > 0) {
            setCurrentIndex(filtered.length - 1);
          } else if (deletedIndex < currentIndex) {
            // If we deleted a card before current, no change needed
            // currentIndex stays the same (but now points to next card)
          } else if (deletedIndex === currentIndex && filtered.length > 0) {
            // If we deleted the current card, stay at same index (which is now next card)
            // But if it was the last card, move back
            if (currentIndex >= filtered.length) {
              setCurrentIndex(filtered.length - 1);
            }
          }
        }
        return filtered;
      });
      setIsFlipped(false); // Reset flip state
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm(`Delete all ${flashcards.length} flashcards? This action cannot be undone.`)) {
      setFlashcards([]);
      setCurrentIndex(0);
      setIsFlipped(false);
      // Clear from localStorage
      try {
        localStorage.removeItem(`moonscribe-project-${projectId}-flashcards`);
      } catch (error) {
        console.error('Failed to clear flashcards from localStorage:', error);
      }
    }
  };

  const handleExport = () => {
    if (flashcards.length === 0) return;

    const exportData = flashcards.map(f => ({
      front: f.front,
      back: f.back,
      source: f.source,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-${projectId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentCard = flashcards[currentIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
            Flashcards
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
            {flashcards.length > 0 
              ? `${flashcards.length} flashcard${flashcards.length !== 1 ? 's' : ''} • Card ${currentIndex + 1} of ${flashcards.length}`
              : 'Generate flashcards from your documents'
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {flashcards.length > 0 && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExport}
              >
                📥 Export
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDeleteAll}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                }}
              >
                🗑️ Delete All
              </Button>
            </>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || sourceFilenames.length === 0}
          >
            {isGenerating ? '⏳ Generating...' : '+ Generate'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#f87171',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {/* Content */}
      {flashcards.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState
            icon="🎴"
            title="No flashcards yet"
            description="Generate flashcards from your documents to start studying"
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Flashcard Display */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            style={{
              flex: 1,
              minHeight: '300px',
              position: 'relative',
              perspective: '1000px',
              cursor: 'pointer',
            }}
          >
            <div style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}>
              {/* Front Face */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                padding: '2rem',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '2px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#f1f5f9',
                  lineHeight: '1.6',
                  maxWidth: '600px',
                }}>
                  {currentCard.front}
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginTop: '1rem',
                }}>
                  Click to reveal answer
                </p>
                <p style={{
                  fontSize: '0.6875rem',
                  color: '#64748b',
                  marginTop: '0.5rem',
                }}>
                  Source: {currentCard.source}
                </p>
              </div>

              {/* Back Face */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                padding: '2rem',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '2px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                transform: 'rotateY(180deg)',
              }}>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#f1f5f9',
                  lineHeight: '1.6',
                  maxWidth: '600px',
                }}>
                  {currentCard.back}
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginTop: '1rem',
                }}>
                  Click to flip back
                </p>
                <p style={{
                  fontSize: '0.6875rem',
                  color: '#64748b',
                  marginTop: '0.5rem',
                }}>
                  Source: {currentCard.source}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              ← Previous
            </Button>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {flashcards.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsFlipped(false);
                  }}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: idx === currentIndex ? '#8b5cf6' : 'rgba(139, 92, 246, 0.3)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex === flashcards.length - 1}
            >
              Next →
            </Button>
          </div>

          {/* Delete Button */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => handleDelete(currentCard.id)}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              🗑️ Delete Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
