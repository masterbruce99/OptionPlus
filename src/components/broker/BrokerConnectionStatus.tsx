'use client';
import React from 'react';
import { BrokerConnectionState } from '@/lib/broker/types';
import { getBrokerSyncState } from '@/lib/broker/brokerStore';
import { explainConnectionState } from '@/lib/broker/connectionEngine';
import { describeSyncStatus } from '@/lib/broker/syncEngine';
import type { SyncSession } from '@/lib/broker/syncEngine';

const STATE_COLORS: Record<BrokerConnectionState, string> = {
  NOT_CONFIGURED: 'var(--text-muted)',
  CONFIGURED: '#60a5fa',
  CONNECTING: '#fbbf24',
  CONNECTED: '#34d399',
  AUTHENTICATION_ERROR: '#f87171',
  PERMISSION_ERROR: '#fb923c',
  RATE_LIMITED: '#f59e0b',
  PROVIDER_ERROR: '#f87171',
  STALE: '#fbbf24',
  DISCONNECTED: '#9ca3af',
  UNKNOWN: '#9ca3af',
};

interface Props {
  syncSession?: SyncSession | null;
  onManualSync?: () => void;
}

export const BrokerConnectionStatus: React.FC<Props> = ({ syncSession, onManualSync }) => {
  // Derive state directly from props — no setState in effects
  const stored = getBrokerSyncState();
  const state: BrokerConnectionState = syncSession?.state.connectionState ?? stored.connectionState;
  const statusText = syncSession ? describeSyncStatus(syncSession) : '';
  const color = STATE_COLORS[state] ?? 'var(--text-muted)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
      {/* Status dot */}
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: state === 'CONNECTED' ? `0 0 6px ${color}` : 'none' }} />
      <div>
        <span style={{ fontWeight: 600, color, fontSize: '0.85rem' }}>{state.replace(/_/g, ' ')}</span>
        {statusText && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{statusText}</span>
        )}
      </div>
      <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '300px' }}>
        {explainConnectionState(state)}
      </div>
      {onManualSync && (
        <button
          onClick={onManualSync}
          style={{ padding: '4px 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
        >
          Sync Now
        </button>
      )}
    </div>
  );
};
