'use client';
import React from 'react';
import { ReconciliationRecord } from '@/lib/broker/types';
import { describeReconciliationState } from '@/lib/broker/reconciliationEngine';

interface Props {
  records: ReconciliationRecord[];
  onUserReviewed?: (record: ReconciliationRecord) => void;
}

const STATE_COLORS: Record<string, string> = {
  MATCH: '#34d399',
  BROKER_ONLY: '#fbbf24',
  OPTIONPLUS_ONLY: '#60a5fa',
  MISMATCH: '#f87171',
  STALE: '#fb923c',
  INSUFFICIENT_DATA: '#9ca3af',
};

export const ReconciliationPanel: React.FC<Props> = ({ records, onUserReviewed }) => {
  if (records.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: '1.5rem 0', textAlign: 'center' }}>
        <p>No reconciliation data.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Import broker positions and connect OptionPlus positions to see reconciliation.
        </p>
      </div>
    );
  }

  const mismatches = records.filter(r => r.state === 'MISMATCH' || r.state === 'BROKER_ONLY' || r.state === 'OPTIONPLUS_ONLY');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Position Reconciliation ({records.length})</h3>
        {mismatches.length > 0 && (
          <div style={{ fontSize: '0.8rem', padding: '4px 12px', background: 'rgba(248,113,113,0.1)', border: '1px solid #f87171', borderRadius: '4px', color: '#f87171' }}>
            {mismatches.length} item{mismatches.length !== 1 ? 's' : ''} require review
          </div>
        )}
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '6px' }}>
        ⚠ OptionPlus never auto-corrects discrepancies. All reconciliation decisions require explicit user review and confirmation.
      </div>

      {records.map((rec, i) => {
        const color = STATE_COLORS[rec.state] ?? '#9ca3af';
        const symbol = rec.brokerPosition?.symbol ?? rec.optionplusPositionId ?? `Record ${i}`;

        return (
          <div key={i} style={{ padding: '1rem', marginBottom: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: `1px solid ${color}40` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{symbol}</span>
                <span style={{ marginLeft: '0.75rem', padding: '2px 8px', background: `${color}20`, border: `1px solid ${color}`, borderRadius: '4px', fontSize: '0.75rem', color, fontWeight: 600 }}>
                  {rec.state}
                </span>
                {rec.staleBrokerData && (
                  <span style={{ marginLeft: '0.5rem', padding: '2px 8px', background: 'rgba(251,191,36,0.15)', border: '1px solid #fbbf24', borderRadius: '4px', fontSize: '0.75rem', color: '#fbbf24' }}>
                    STALE DATA
                  </span>
                )}
              </div>
              {(rec.state === 'MISMATCH' || rec.state === 'BROKER_ONLY' || rec.state === 'OPTIONPLUS_ONLY') && !rec.reviewedByUser && onUserReviewed && (
                <button
                  onClick={() => onUserReviewed(rec)}
                  style={{ padding: '4px 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}
                >
                  Mark Reviewed
                </button>
              )}
              {rec.reviewedByUser && (
                <span style={{ fontSize: '0.75rem', color: '#34d399' }}>✓ Reviewed</span>
              )}
            </div>

            <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {rec.explanation}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {describeReconciliationState(rec.state)}
            </p>

            {rec.discrepancies.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f87171', marginBottom: '0.3rem' }}>Discrepancies:</div>
                {rec.discrepancies.map((d, j) => (
                  <div key={j} style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', padding: '3px 0' }}>
                    <span style={{ fontWeight: 600, minWidth: '100px' }}>{d.field}</span>
                    <span>Broker: <strong style={{ color: '#fbbf24' }}>{String(d.brokerValue)}</strong></span>
                    <span>OptionPlus: <strong style={{ color: '#60a5fa' }}>{String(d.optionplusValue)}</strong></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
