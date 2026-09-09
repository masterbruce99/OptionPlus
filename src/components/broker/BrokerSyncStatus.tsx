'use client';
import React from 'react';
import { SyncSession, describeSyncStatus } from '@/lib/broker/syncEngine';
import { BrokerSyncState } from '@/lib/broker/types';

interface Props {
  session?: SyncSession | null;
  state?: BrokerSyncState | null;
}

export const BrokerSyncStatus: React.FC<Props> = ({ session, state }) => {
  const syncState = session?.state ?? state;
  if (!syncState) return null;

  const statusText = session ? describeSyncStatus(session) : syncState.syncStatus;
  const isSyncing = syncState.syncStatus === 'SYNCING';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
      {isSyncing && (
        <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
      )}
      <span style={{ color: 'var(--text-muted)' }}>Sync:</span>
      <span style={{ fontWeight: 600, color: syncState.syncStatus === 'SUCCESS' ? '#34d399' : syncState.syncStatus === 'FAILED' || syncState.syncStatus === 'RATE_LIMITED' ? '#f87171' : 'var(--text-primary)' }}>
        {statusText}
      </span>
      {syncState.retryCount > 0 && (
        <span style={{ color: 'var(--text-muted)' }}>· Retry {syncState.retryCount}</span>
      )}
      {syncState.syncDurationMs !== null && (
        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {syncState.syncDurationMs}ms
        </span>
      )}
    </div>
  );
};
