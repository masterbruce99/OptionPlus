'use client';
import { useState } from 'react';
import { WatchlistItem, getWatchlist, addToWatchlist, removeFromWatchlist, clearWatchlist } from '@/lib/store';

export default function WatchlistPanel() {
  const [items, setItems] = useState<WatchlistItem[]>(() => {
    if (typeof window !== 'undefined') return getWatchlist();
    return [];
  });
  const [newSymbol, setNewSymbol] = useState('');
  const [newType, setNewType] = useState<WatchlistItem['type']>('symbol');
  const [newDesc, setNewDesc] = useState('');

  const refresh = () => setItems(getWatchlist());

  const handleAdd = () => {
    if (!newSymbol.trim()) return;
    addToWatchlist({
      type: newType,
      symbol: newSymbol.toUpperCase().trim(),
      description: newDesc || `${newType}: ${newSymbol.toUpperCase()}`
    });
    setNewSymbol('');
    setNewDesc('');
    refresh();
  };

  const handleRemove = (id: string) => {
    removeFromWatchlist(id);
    refresh();
  };

  const handleClear = () => {
    if (confirm('Clear entire watchlist?')) {
      clearWatchlist();
      refresh();
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 8px', fontSize: '0.85rem',
    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
    border: '1px solid var(--border-color)', borderRadius: '4px'
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0 }}>📋 Watchlist ({items.length})</h4>
        {items.length > 0 && (
          <button onClick={handleClear} style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
            Clear All
          </button>
        )}
      </div>

      {/* Add form */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <select value={newType} onChange={e => setNewType(e.target.value as WatchlistItem['type'])} style={inputStyle}>
          <option value="symbol">Symbol</option>
          <option value="option">Option</option>
          <option value="structure">Structure</option>
          <option value="expiration">Expiration</option>
        </select>
        <input
          type="text" placeholder="Symbol" value={newSymbol}
          onChange={e => setNewSymbol(e.target.value)}
          style={{ ...inputStyle, width: '80px' }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <input
          type="text" placeholder="Description (optional)" value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: '100px' }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600,
            backgroundColor: 'var(--accent-primary)', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer'
          }}
        >
          Add
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
          No items in watchlist. Add symbols or structures to track.
        </p>
      ) : (
        <div>
          {items.map(item => (
            <div key={item.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0', borderBottom: '1px solid var(--border-color)'
            }}>
              <div>
                <span style={{
                  display: 'inline-block', padding: '1px 6px', borderRadius: '3px',
                  fontSize: '0.7rem', fontWeight: 600, marginRight: '0.5rem',
                  backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)'
                }}>
                  {item.type.toUpperCase()}
                </span>
                <strong style={{ fontSize: '0.85rem' }}>{item.symbol}</strong>
                {item.description && (
                  <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                    {item.description}
                  </span>
                )}
              </div>
              <button onClick={() => handleRemove(item.id)} style={{
                background: 'none', border: 'none', color: 'var(--danger)',
                cursor: 'pointer', fontSize: '1rem', padding: '0 4px'
              }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
