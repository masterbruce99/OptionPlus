'use client';
import { useState } from 'react';
import {
  JournalEntry, MarketView, addJournalEntry,
  closeJournalEntry, deleteJournalEntry, getOpenTrades, getClosedTrades,
  calculatePostTradeAnalysis
} from '@/lib/store';

export default function TradeJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [view, setView] = useState<'open' | 'closed' | 'new'>('open');
  const [selected, setSelected] = useState<JournalEntry | null>(null);

  // New entry form
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [underlying, setUnderlying] = useState('');
  const [strategy, setStrategy] = useState('');
  const [direction, setDirection] = useState<MarketView>('bullish');
  const [contracts, setContracts] = useState(1);
  const [entryPrice, setEntryPrice] = useState(0);
  const [thesis, setThesis] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [risk, setRisk] = useState('');
  const [notes, setNotes] = useState('');

  // Close form
  const [closeId, setCloseId] = useState<string | null>(null);
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [exitPrice, setExitPrice] = useState(0);
  const [realizedPL, setRealizedPL] = useState(0);
  const [closeNotes, setCloseNotes] = useState('');

  const loadEntries = (v: 'open' | 'closed' | 'new'): JournalEntry[] => {
    if (typeof window === 'undefined') return [];
    if (v === 'open') return getOpenTrades();
    if (v === 'closed') return getClosedTrades();
    return [];
  };

  const refresh = () => {
    setEntries(loadEntries(view));
  };

  const handleSubmitNew = () => {
    if (!underlying || !strategy || !thesis) return;
    addJournalEntry({
      date, underlying: underlying.toUpperCase(), strategy, direction,
      contracts, entryPrice, thesis, expectedOutcome, risk, notes,
      status: 'open'
    });
    setUnderlying(''); setStrategy(''); setThesis('');
    setExpectedOutcome(''); setRisk(''); setNotes('');
    setView('open');
    refresh();
  };

  const handleClose = () => {
    if (!closeId) return;
    closeJournalEntry(closeId, exitDate, exitPrice, realizedPL, closeNotes);
    setCloseId(null);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this journal entry?')) {
      deleteJournalEntry(id);
      if (selected?.id === id) setSelected(null);
      refresh();
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px', fontSize: '0.85rem', width: '100%',
    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
    border: '1px solid var(--border-color)', borderRadius: '4px'
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
    border: 'none', borderRadius: '4px',
    backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
    color: active ? '#fff' : 'var(--text-primary)'
  });

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem' }}>📖 Trade Journal</h3>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button style={tabStyle(view === 'open')} onClick={() => { setView('open'); setEntries(loadEntries('open')); }}>Open Trades</button>
        <button style={tabStyle(view === 'closed')} onClick={() => { setView('closed'); setEntries(loadEntries('closed')); }}>Closed Trades</button>
        <button style={tabStyle(view === 'new')} onClick={() => { setView('new'); setEntries([]); }}>New Entry</button>
      </div>

      {/* New Entry Form */}
      {view === 'new' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Symbol</label>
            <input value={underlying} onChange={e => setUnderlying(e.target.value)} placeholder="AAPL" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Strategy</label>
            <input value={strategy} onChange={e => setStrategy(e.target.value)} placeholder="Bull Call Spread" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direction</label>
            <select value={direction} onChange={e => setDirection(e.target.value as MarketView)} style={inputStyle}>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contracts</label>
            <input type="number" min={1} value={contracts} onChange={e => setContracts(parseInt(e.target.value) || 1)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entry Price (per contract)</label>
            <input type="number" step="0.01" value={entryPrice} onChange={e => setEntryPrice(parseFloat(e.target.value) || 0)} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thesis (Why this trade?)</label>
            <textarea value={thesis} onChange={e => setThesis(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What is your market view? Why this specific strategy?" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Outcome</label>
            <input value={expectedOutcome} onChange={e => setExpectedOutcome(e.target.value)} placeholder="Stock stays above $150 by expiration" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk Assessment</label>
            <input value={risk} onChange={e => setRisk(e.target.value)} placeholder="Max loss: $200 if stock drops below $148" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 0.5rem' }}>
              All journal data is USER ENTERED and stored locally. This is not market data.
            </p>
            <button onClick={handleSubmitNew} style={{
              padding: '10px 24px', fontWeight: 700, fontSize: '0.9rem',
              backgroundColor: 'var(--accent-primary)', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer'
            }}>
              Save Entry
            </button>
          </div>
        </div>
      )}

      {/* Trade List */}
      {(view === 'open' || view === 'closed') && (
        <>
          {entries.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>
              No {view} trades. {view === 'open' ? 'Add a new entry to start tracking.' : 'Close open trades to see them here.'}
            </p>
          ) : (
            entries.map(entry => (
              <div key={entry.id} style={{
                padding: '0.75rem', marginBottom: '0.5rem',
                background: 'var(--bg-tertiary)', borderRadius: '6px',
                borderLeft: `3px solid ${entry.direction === 'bullish' ? 'var(--success)' : entry.direction === 'bearish' ? 'var(--danger)' : 'var(--text-muted)'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{entry.underlying}</strong>
                    <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                      {entry.strategy} · {entry.direction} · {entry.contracts} contract(s)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>{entry.date}</span>
                    {entry.status === 'open' && (
                      <button onClick={() => { setCloseId(entry.id); setExitDate(new Date().toISOString().split('T')[0]); }} style={{
                        padding: '3px 8px', fontSize: '0.7rem', fontWeight: 600,
                        backgroundColor: 'var(--success)', color: '#fff',
                        border: 'none', borderRadius: '3px', cursor: 'pointer'
                      }}>Close</button>
                    )}
                    <button onClick={() => handleDelete(entry.id)} style={{
                      background: 'none', border: 'none', color: 'var(--danger)',
                      cursor: 'pointer', fontSize: '0.9rem'
                    }}>×</button>
                  </div>
                </div>

                {entry.thesis && (
                  <p style={{ fontSize: '0.8rem', margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>
                    <strong>Thesis:</strong> {entry.thesis}
                  </p>
                )}

                {/* Post-trade analysis for closed trades */}
                {entry.status === 'closed' && (() => {
                  const analysis = calculatePostTradeAnalysis(entry);
                  if (!analysis) return null;
                  return (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                        <span>P/L: <strong style={{ color: analysis.actualRealizedPL >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          ${analysis.actualRealizedPL.toFixed(2)}
                        </strong></span>
                        <span>ROC: <strong>{(analysis.returnOnCapital * 100).toFixed(1)}%</strong></span>
                        <span>Days: <strong>{analysis.daysHeld}</strong></span>
                        <span>Thesis: <strong style={{
                          color: analysis.thesisAccuracy === 'CORRECT_DIRECTION' ? 'var(--success)' :
                            analysis.thesisAccuracy === 'WRONG_DIRECTION' ? 'var(--danger)' : 'var(--text-muted)'
                        }}>{analysis.thesisAccuracy.replace(/_/g, ' ')}</strong></span>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', fontStyle: 'italic' }}>
                        Data Source: {analysis.dataSource}
                      </p>
                    </div>
                  );
                })()}

                {/* Close trade form */}
                {closeId === entry.id && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Exit Date</label>
                      <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Exit Price</label>
                      <input type="number" step="0.01" value={exitPrice} onChange={e => setExitPrice(parseFloat(e.target.value) || 0)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Realized P/L ($)</label>
                      <input type="number" step="0.01" value={realizedPL} onChange={e => setRealizedPL(parseFloat(e.target.value) || 0)} style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <input value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="Exit notes" style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleClose} style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'var(--success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Confirm Close
                      </button>
                      <button onClick={() => setCloseId(null)} style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
