"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';

interface Quality {
  id: string;
  label: string;
  height: number;
  ext: string;
  url: string | null;
}

interface PreviewData {
  title: string;
  thumbnail: string;
  qualities: Quality[];
}

interface HistoryItem {
  job_id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  percent: number;
  created_at: string;
  direct_url: string | null;
}

export default function VideoDownloader() {
  const [mounted, setMounted] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [selectedQuality, setSelectedQuality] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<{ status: string; percent: number; done: boolean } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Password modal states
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; action: 'update' | 'clear-temp' | 'clear-history' | null }>({
    open: false,
    action: null
  });
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch download history from browser-cached sessionStorage (deleted when window/tab is closed)
  const fetchHistory = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('download_history');
        if (stored) {
          setHistory(JSON.parse(stored));
        } else {
          setHistory([]);
        }
      } catch (err) {
        console.error('Failed to load history from sessionStorage:', err);
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchHistory();

    // Register PWA service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('ServiceWorker registration successful:', reg.scope))
          .catch((err) => console.warn('ServiceWorker registration failed:', err));
      });
    }
  }, []);

  // Fetch preview details (title, thumbnail, formats)
  const handleGetPreview = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setPreview(null);
    setStatusMessage('');
    
    try {
      const res = await fetch('/api/qualities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await res.json();
      if (res.ok && data.qualities) {
        setPreview(data);
        if (data.qualities.length > 0) {
          setSelectedQuality(data.qualities[0].id);
        }
      } else {
        alert(data.error || 'Failed to fetch video qualities.');
      }
    } catch (err) {
      console.error('Error fetching qualities:', err);
      alert('An error occurred while fetching video qualities.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger video download statelessly
  const handleStartDownload = async () => {
    if (!url || !selectedQuality || !preview) return;
    setStatusMessage('');
    
    try {
      const selectedFormat = preview.qualities.find(q => q.id === selectedQuality);
      if (!selectedFormat || !selectedFormat.url) {
        alert('Could not find download URL for the selected quality.');
        return;
      }
      
      // Build stateless pass-through stream proxy URL
      const downloadProxyUrl = `/api/download?url=${encodeURIComponent(selectedFormat.url)}&title=${encodeURIComponent(preview.title)}&ext=${encodeURIComponent(selectedFormat.ext)}`;
      
      // Simulate progress feedback for visual excellence
      setDownloadProgress({ status: 'Tunnelling stream...', percent: 40, done: false });
      
      setTimeout(() => {
        setDownloadProgress({ status: 'Streaming to browser...', percent: 80, done: false });
      }, 800);

      setTimeout(() => {
        setDownloadProgress(null);
        setStatusMessage('Tunnelling started! Check your browser download folder.');
        
        // Add to sessionStorage history list
        const newHistoryItem: HistoryItem = {
          job_id: Math.random().toString(36).substring(7),
          title: preview.title,
          status: 'completed',
          percent: 100,
          created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          direct_url: downloadProxyUrl
        };
        
        const updatedHistory = [newHistoryItem, ...history].slice(0, 10);
        setHistory(updatedHistory);
        sessionStorage.setItem('download_history', JSON.stringify(updatedHistory));
      }, 1500);

      // Trigger standard browser file downloading
      const link = document.createElement('a');
      link.href = downloadProxyUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error('Error starting download:', err);
      alert('An error occurred while starting download.');
    }
  };

  // Trigger direct download of CDN link for maximum direct speed
  const handleDirectDownload = () => {
    if (!preview || !selectedQuality) return;
    setStatusMessage('');
    
    const selectedFormat = preview.qualities.find(q => q.id === selectedQuality);
    if (!selectedFormat || !selectedFormat.url) {
      alert('Could not find direct download URL.');
      return;
    }
    
    // Add to sessionStorage history list
    const newHistoryItem: HistoryItem = {
      job_id: Math.random().toString(36).substring(7),
      title: preview.title,
      status: 'completed',
      percent: 100,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      direct_url: selectedFormat.url
    };
    
    const updatedHistory = [newHistoryItem, ...history].slice(0, 10);
    setHistory(updatedHistory);
    sessionStorage.setItem('download_history', JSON.stringify(updatedHistory));
    
    setStatusMessage('Opening direct high-speed download link...');
    window.open(selectedFormat.url, '_blank');
  };

  // Open password verification modal
  const openPasswordModal = (action: 'update' | 'clear-temp' | 'clear-history') => {
    setPassword('');
    setStatusMessage('');
    setPasswordModal({ open: true, action });
  };

  // Submit password and execute admin operation
  const handleAdminActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModal.action) return;

    const action = passwordModal.action;
    
    if (password !== '1995') {
      alert('Incorrect Password');
      setPasswordModal({ open: false, action: null });
      return;
    }

    setPasswordModal({ open: false, action: null });

    if (action === 'clear-history') {
      sessionStorage.removeItem('download_history');
      setHistory([]);
      setPreview(null);
      setUrl('');
      setStatusMessage('Session download history cleared successfully.');
      return;
    }

    // Call dynamic backend scripts (Update or Clear Cache)
    setLoading(true);
    let endpoint = action === 'update' ? '/api/admin/update' : '/api/admin/clear-temp';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(data.message || 'Operation executed successfully.');
      } else {
        alert(data.error || 'Operation failed.');
      }
    } catch (err) {
      console.error('Admin request failed:', err);
      alert('An error occurred while executing admin action.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger direct download of previously scraped file
  const handleSaveScraped = (directUrl: string) => {
    window.location.href = directUrl;
  };

  return (
    <div className="main-container">
      {/* Header section with Tray icon */}
      <div className="header-container">
        <h1 className="header-title">
          <span className="header-icon">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 15V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V15" stroke="#e05a36" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M12 3V14M12 14L8 10M12 14L16 10" stroke="#e05a36" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="2" y="13" width="20" height="3" rx="1.5" fill="#f09675" fillOpacity="0.4"/>
            </svg>
          </span>
          Video Downloader
        </h1>
        
        {/* Admin actions pill links */}
        <div className="admin-pills">
          <button className="admin-pill-btn" onClick={() => openPasswordModal('update')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            Update yt-dlp
          </button>
          
          <button className="admin-pill-btn" onClick={() => openPasswordModal('clear-temp')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Clear Cache/Temp
          </button>
        </div>
      </div>

      {/* Main interactive form */}
      <div className="input-group">
        <input
          type="text"
          className="url-input"
          placeholder="Paste YouTube / video URL here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={!mounted || loading || !!downloadProgress}
          suppressHydrationWarning
        />
      </div>

      <button
        className="primary-btn"
        onClick={handleGetPreview}
        disabled={!mounted || loading || !url.trim() || !!downloadProgress}
        suppressHydrationWarning
      >
        {loading ? 'Processing...' : 'Get Preview'}
      </button>

      {/* Show admin action feedback messages if any */}
      {statusMessage && (
        <div style={{ textAlign: 'center', fontSize: '13px', color: '#16a34a', fontWeight: '500', marginBottom: '16px' }}>
          {statusMessage}
        </div>
      )}

      {/* Render quality options once preview is loaded */}
      {preview && !downloadProgress && (
        <div className="preview-container">
          {preview.thumbnail && (
            <img src={preview.thumbnail} alt="Poster" className="preview-thumbnail" />
          )}
          <div className="preview-title">{preview.title}</div>
          
          <div className="quality-select-wrapper">
            <select
              className="quality-select"
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
            >
              {preview.qualities.length > 0 ? (
                preview.qualities.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))
              ) : (
                <option value="">No formats available</option>
              )}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '4px' }}>
            <button
              className="primary-btn"
              style={{ margin: 0, flex: 1 }}
              onClick={handleStartDownload}
              disabled={!selectedQuality}
            >
              Download (Proxy)
            </button>
            <button
              className="primary-btn"
              style={{ margin: 0, flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
              onClick={handleDirectDownload}
              disabled={!selectedQuality}
            >
              ⚡ Fast Direct Link
            </button>
          </div>
        </div>
      )}

      {/* Render active progress bar when downloading */}
      {downloadProgress && (
        <div className="preview-container">
          <div className="preview-title" style={{ fontSize: '14px', marginBottom: '8px' }}>
            {preview?.title || 'Downloading Video...'}
          </div>
          <div className="progress-container">
            <div className="progress-header">
              <span>{downloadProgress.status}</span>
              <span>{Math.round(downloadProgress.percent)}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-bar"
                style={{ width: `${downloadProgress.percent}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <hr className="divider" />

      {/* Recent Downloads Section */}
      <h2 className="section-title">Recent Downloads</h2>
      
      <div className="history-list">
        {history.length > 0 ? (
          history.map((item) => (
            <div className="history-item" key={item.job_id}>
              <div className="history-title" title={item.title}>
                {item.title}
              </div>
              <div>
                {item.direct_url ? (
                  <button
                    className="badge-save"
                    onClick={() => handleSaveScraped(item.direct_url!)}
                  >
                    Save
                  </button>
                ) : (
                  <span className="badge-failed">Failed</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '20px 0' }}>
            No recent downloads
          </div>
        )}
      </div>

      {/* Clear history red button */}
      <div className="clear-history-container">
        <button className="clear-history-btn" onClick={() => openPasswordModal('clear-history')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          Clear History & Files
        </button>
      </div>

      {/* Password verification Glassmorphic Modal */}
      {passwordModal.open && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleAdminActionSubmit}>
            <h3 className="modal-title">Enter Admin Password</h3>
            <p className="modal-subtitle">
              This action is protected. Enter the system password to execute.
            </p>
            <input
              type="password"
              className="modal-input"
              required
              autoFocus
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="modal-buttons">
              <button
                type="button"
                className="modal-btn-cancel"
                onClick={() => setPasswordModal({ open: false, action: null })}
              >
                Cancel
              </button>
              <button type="submit" className="modal-btn-submit">
                Execute
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
