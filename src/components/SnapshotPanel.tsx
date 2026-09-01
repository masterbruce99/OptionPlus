'use client';
import { useState } from 'react';
import { OpportunitySnapshot, getSnapshots, deleteSnapshot, clearSnapshots } from '@/lib/store';
import { RankedOpportunity } from '@/lib/opportunityEngine';

interface SnapshotPanelProps {
  currentOpportunity?: RankedOpportunity;
  onSaveSnapshot?: () => void;
}

export default function SnapshotPanel({ onSaveSnapshot }: SnapshotPanelProps) {
  const [snapshots, setSnapshots] = useState<OpportunitySnapshot[]>(() => {
    if (typeof window !== 'undefined') return getSnapshots();
    return [];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = () => setSnapshots(getSnapshots());

  const handleDelete = (id: string) => {
    deleteSnapshot(id);
    if (selectedId === id) setSelectedId(null);
    refresh();
  };

  const handleClear = () => {
    if (confirm('Delete all snapshots?')) {
      clearSnapshots();
      setSelectedId(null);
      refresh();
    }
  };

  const selected = snapshots.find(s => s.id === selectedId);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0 }}>📸 Snapshots ({snapshots.length})</h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onSaveSnapshot && (
            <button onClick={onSaveSnapshot} style={{
              padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600,
              backgroundColor: 'var(--accent-primary)', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer'
            }}>
              Save Current
            </button>
          )}
          {snapshots.length > 0 && (
            <button onClick={handleClear} style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
          No snapshots saved. Save an opportunity to compare later.
        </p>
      ) : (
        <div>
          {snapshots.slice(0, 10).map(snap => (
            <div key={snap.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0', borderBottom: '1px solid var(--border-color)',
              cursor: 'pointer', backgroundColor: selectedId === snap.id ? 'var(--bg-tertiary)' : 'transparent'
            }} onClick={() => setSelectedId(selectedId === snap.id ? null : snap.id)}>
              <div>
                <strong style={{ fontSize: '0.85rem' }}>{snap.underlying}</strong>
                <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                  {snap.classification}
                </span>
                <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                  Edge: ${snap.calculatedEdge.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                  {new Date(snap.timestamp).toLocaleString()}
                </span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(snap.id); }} style={{
                  background: 'none', border: 'none', color: 'var(--danger)',
                  cursor: 'pointer', fontSize: '0.9rem'
                }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Snapshot detail */}
      {selected && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
          <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>Snapshot: {selected.underlying} — {selected.classification}</h5>
          <div style={{ fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Edge</span><span>${selected.calculatedEdge.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Quality</span><span>{selected.qualityScore}/100</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Liquidity</span><span>{selected.liquidityScore}/100</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Execution</span><span>{selected.executionScore}/100</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Data Quality</span><span>{selected.dataQualityScore}/100</span>
            </div>
          </div>
          {selected.legs.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Legs: {selected.legs.map(l => `${l.side} ${l.type} @ $${l.strike}`).join(' | ')}
            </div>
          )}
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
            Saved: {new Date(selected.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
