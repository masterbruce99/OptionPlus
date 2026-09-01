'use client';
import { useState, useEffect } from 'react';
import { 
  AdvancedJournalEntry, 
  getJournal,
  deleteJournalEntry
} from '../../lib/store';
import { TradeEntryForm } from './TradeEntryForm';
import { TradePostMortemForm, PostMortemDisplay } from './TradePostMortem';
import { PerformanceAnalytics } from './PerformanceAnalytics';
import { TradeTimeline } from './TradeTimeline';

export function LearningJournal() {
  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'new' | 'analytics'>('open');
  const [allEntries, setAllEntries] = useState<AdvancedJournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AdvancedJournalEntry | null>(null);

  const refreshData = () => {
    setAllEntries(getJournal());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
  }, []);

  // Derive filtered entries based on the active tab synchronously
  const entries = activeTab === 'open' 
    ? allEntries.filter(e => e.status === 'open') 
    : activeTab === 'closed'
      ? allEntries.filter(e => e.status === 'closed')
      : activeTab === 'analytics'
        ? allEntries
        : [];

  const handleDelete = (id: string) => {
    if (confirm('Delete this journal entry?')) {
      deleteJournalEntry(id);
      if (selectedEntry?.id === id) setSelectedEntry(null);
      refreshData();
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
    border: 'none', borderRadius: '4px',
    backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
    color: active ? '#fff' : 'var(--text-primary)'
  });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>📖 Structured Learning Journal</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={tabStyle(activeTab === 'open')} onClick={() => { setActiveTab('open'); setSelectedEntry(null); }}>Open Trades</button>
          <button style={tabStyle(activeTab === 'closed')} onClick={() => { setActiveTab('closed'); setSelectedEntry(null); }}>Post-Mortems</button>
          <button style={tabStyle(activeTab === 'new')} onClick={() => { setActiveTab('new'); setSelectedEntry(null); }}>+ New Idea</button>
          <button style={tabStyle(activeTab === 'analytics')} onClick={() => { setActiveTab('analytics'); setSelectedEntry(null); }}>📊 Analytics</button>
        </div>
      </div>

      {activeTab === 'new' && (
        <div className="animate-fade-in">
          <TradeEntryForm onSaved={() => setActiveTab('open')} />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="animate-fade-in">
          <PerformanceAnalytics entries={entries} />
        </div>
      )}

      {(activeTab === 'open' || activeTab === 'closed') && !selectedEntry && (
        <div className="animate-fade-in">
          {entries.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '3rem 0' }}>
              No {activeTab} trades found.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {entries.map(entry => (
                <div key={entry.id} 
                  onClick={() => setSelectedEntry(entry)}
                  style={{
                    padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '6px',
                    borderLeft: `4px solid ${entry.direction === 'bullish' ? 'var(--success)' : entry.direction === 'bearish' ? 'var(--danger)' : 'var(--text-muted)'}`,
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem' }}>{entry.underlying} - {entry.strategy}</h4>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>{entry.date} | {entry.direction} | {entry.contracts} contracts</span>
                  </div>
                  {entry.status === 'closed' && entry.postMortem && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 'bold', color: entry.postMortem.realizedPL >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        ${entry.postMortem.realizedPL.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(activeTab === 'open' || activeTab === 'closed') && selectedEntry && (
        <div className="animate-fade-in">
          <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', marginBottom: '1rem', padding: 0 }}>
            &larr; Back to List
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 0.5rem' }}>{selectedEntry.underlying} {selectedEntry.strategy}</h2>
              <p className="text-muted" style={{ margin: 0 }}>Entry: {selectedEntry.date} | ${selectedEntry.entryPrice} x {selectedEntry.contracts}</p>
            </div>
            <button onClick={() => handleDelete(selectedEntry.id)} style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Delete Trade</button>
          </div>

          <TradeTimeline entry={selectedEntry} />

          {selectedEntry.status === 'open' && (
            <TradePostMortemForm entry={selectedEntry} onClosed={() => { setSelectedEntry(null); setActiveTab('closed'); }} />
          )}

          {selectedEntry.status === 'closed' && (
            <PostMortemDisplay entry={selectedEntry} />
          )}
        </div>
      )}

    </div>
  );
}
