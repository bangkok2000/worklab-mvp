'use client';

import { useState } from 'react';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<any[]>([]);

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadStatus('Uploading and processing...');

    let successCount = 0;
    let totalChunks = 0;

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

    setUploadStatus(`✓ Processed ${totalChunks} chunks from ${successCount} file(s)`);
    setUploading(false);
  };

  const handleAsk = async () => {
    if (!question.trim()) return;

    setAsking(true);
    setAnswer('');
    setSources([]);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (data.answer) {
        setAnswer(data.answer);
        setSources(data.sources || []);
      } else {
        setAnswer(`Error: ${data.error}`);
      }
    } catch (error: any) {
      setAnswer(`Error: ${error.message}`);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>WorkLab MVP</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>Upload PDFs and ask questions about them</p>

      {/* Upload Section */}
      <div style={{ marginBottom: '40px', padding: '20px', border: '2px dashed #ddd', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>1. Upload Documents</h2>
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          style={{ marginBottom: '12px', display: 'block' }}
        />
        {files.length > 0 && (
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
            {files.length} file(s) selected: {files.map(f => f.name).join(', ')}
          </p>
        )}
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          style={{
            padding: '10px 20px',
            backgroundColor: uploading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? 'Processing...' : 'Upload & Process'}
        </button>
        {uploadStatus && (
          <p style={{ marginTop: '12px', color: uploadStatus.startsWith('✓') ? 'green' : 'red' }}>
            {uploadStatus}
          </p>
        )}
      </div>

      {/* Ask Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>2. Ask Questions</h2>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to know about your documents?"
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            marginBottom: '12px',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleAsk}
          disabled={!question.trim() || asking}
          style={{
            padding: '10px 20px',
            backgroundColor: asking ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: asking ? 'not-allowed' : 'pointer',
          }}
        >
          {asking ? 'Thinking...' : 'Ask Question'}
        </button>
      </div>

      {/* Answer Section */}
      {answer && (
        <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Answer:</h3>
          <p style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{answer}</p>
          
          {sources.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Sources:</h4>
              {sources.map((source) => (
                <div key={source.number} style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                  [{source.number}] {source.source} (relevance: {source.relevance}%)
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}