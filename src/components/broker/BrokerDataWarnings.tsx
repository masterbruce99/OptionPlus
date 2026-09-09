'use client';
import React from 'react';

// Data warnings displayed when broker data is partial or missing.
interface Warning {
  severity: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  detail?: string;
}

interface Props {
  warnings: Warning[];
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  INFO: { bg: 'rgba(96,165,250,0.05)', border: 'rgba(96,165,250,0.3)', color: '#60a5fa', icon: 'ℹ' },
  WARNING: { bg: 'rgba(251,191,36,0.05)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24', icon: '⚠' },
  ERROR: { bg: 'rgba(248,113,113,0.05)', border: 'rgba(248,113,113,0.3)', color: '#f87171', icon: '✕' },
};

export const BrokerDataWarnings: React.FC<Props> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Broker Data Notices</h4>
      {warnings.map((w, i) => {
        const s = SEVERITY_STYLES[w.severity];
        return (
          <div key={i} style={{ padding: '0.5rem 0.75rem', marginBottom: '0.4rem', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '6px', fontSize: '0.82rem', color: s.color }}>
            {s.icon} {w.message}
            {w.detail && <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>{w.detail}</div>}
          </div>
        );
      })}
    </div>
  );
};
