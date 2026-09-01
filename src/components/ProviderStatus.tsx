'use client';
import { useState, useEffect } from 'react';

export default function ProviderStatus() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // We can just try to fetch a well-known symbol's quote like SPY to see if it works
    fetch('/api/quote?symbol=SPY')
      .then(res => {
        if (res.status === 503) {
          return res.json().then(data => {
            setStatus('error');
            setMessage(data.error);
          });
        }
        if (res.ok) {
          setStatus('ok');
        } else {
          setStatus('error');
          setMessage('Failed to connect to market data provider.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error connecting to API.');
      });
  }, []);

  if (status === 'checking') return null;

  if (status === 'error') {
    return (
      <div className="card text-danger" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--danger)' }}>
        <h3 style={{ margin: 0 }}>Configuration Error</h3>
        <p>{message}</p>
        <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Please configure your market data provider API keys in the <code>.env.local</code> file and restart the server.
        </p>
      </div>
    );
  }

  return null;
}
