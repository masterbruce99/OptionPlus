import React, { useState } from 'react';
interface EventScannerProps {
  onSearch: (symbol: string, type?: string) => void;
  isLoading?: boolean;
}

export const EventScanner: React.FC<EventScannerProps> = ({ onSearch, isLoading }) => {
  const [symbol, setSymbol] = useState('');
  const [eventType, setEventType] = useState('all');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    onSearch(symbol.trim().toUpperCase(), eventType === 'all' ? undefined : eventType);
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Event Scanner</h3>
      </div>
      <div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <input 
              type="text"
              placeholder="Enter ticker symbol (e.g., AAPL)" 
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                textTransform: 'uppercase'
              }}
            />
          </div>
          <div style={{ width: '180px' }}>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Events</option>
              <option value="earnings">Earnings</option>
              <option value="dividend">Dividend</option>
              <option value="split">Stock Split</option>
              <option value="macro">Macroeconomic</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={!symbol.trim() || isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: (!symbol.trim() || isLoading) ? 'not-allowed' : 'pointer',
              opacity: (!symbol.trim() || isLoading) ? 0.7 : 1
            }}
          >
            {isLoading ? 'Scanning...' : 'Scan Events'}
          </button>
        </form>
      </div>
    </div>
  );
};
