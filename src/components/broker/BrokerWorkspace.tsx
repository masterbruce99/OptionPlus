'use client';
import React, { useState, useEffect } from 'react';
import { BrokerConnectionStatus } from './BrokerConnectionStatus';
import { AccountOverview } from './AccountOverview';
import { AccountBalances } from './AccountBalances';
import { BrokerPositions } from './BrokerPositions';
import { BrokerOrders } from './BrokerOrders';
import { BrokerFills } from './BrokerFills';
import { ReconciliationPanel } from './ReconciliationPanel';
import { BrokerSyncStatus } from './BrokerSyncStatus';
import { BrokerDataWarnings } from './BrokerDataWarnings';
import { BrokerAccount, BrokerPosition, BrokerOrder, BrokerFill, ReconciliationRecord } from '@/lib/broker/types';
import {
  getBrokerAccount,
  getBrokerPositions,
  getBrokerOrders,
  getBrokerFills,
  getBrokerSyncState,
  clearAllBrokerData,
} from '@/lib/broker/brokerStore';
import { reconcilePositions } from '@/lib/broker/reconciliationEngine';
import { getLivePositions } from '@/lib/positions/positionStore';
import { createSyncSession, beginSync, completeSyncSuccess, completeSyncFailure, isSyncDataStale } from '@/lib/broker/syncEngine';
import type { SyncSession } from '@/lib/broker/syncEngine';

type BrokerTab = 'overview' | 'balances' | 'positions' | 'orders' | 'fills' | 'reconciliation' | 'settings';

const TABS: { id: BrokerTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'balances', label: 'Balances' },
  { id: 'positions', label: 'Positions' },
  { id: 'orders', label: 'Orders' },
  { id: 'fills', label: 'Fill History' },
  { id: 'reconciliation', label: 'Reconciliation' },
  { id: 'settings', label: 'Settings' },
];

export const BrokerWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BrokerTab>('overview');
  const [account, setAccount] = useState<BrokerAccount | null>(null);
  const [positions, setPositions] = useState<BrokerPosition[]>([]);
  const [orders, setOrders] = useState<BrokerOrder[]>([]);
  const [fills, setFills] = useState<BrokerFill[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationRecord[]>([]);
  const [session, setSession] = useState<SyncSession>(() => createSyncSession('NONE'));
  const [isStale, setIsStale] = useState(false);

  const warnings = [];
  if (isStale) {
    warnings.push({
      severity: 'WARNING' as const,
      message: 'Account data may be stale.',
      detail: 'Trigger a manual sync to refresh broker data.',
    });
  }
  if (account === null) {
    warnings.push({
      severity: 'INFO' as const,
      message: 'No broker connected.',
      detail: 'Set BROKER_API_KEY in your server environment and configure your broker in Settings.',
    });
  }

  useEffect(() => {
    // Hydrate from store on mount
    const timer = setTimeout(() => {
      const storedAccount = getBrokerAccount();
      const storedPositions = getBrokerPositions();
      const storedOrders = getBrokerOrders();
      const storedFills = getBrokerFills();
      const syncState = getBrokerSyncState();

      setAccount(storedAccount);
      setPositions(storedPositions);
      setOrders(storedOrders);
      setFills(storedFills);

      // Restore sync session state
      const restoredSession: SyncSession = {
        state: syncState,
        rateLimit: { requestCount: 0, windowStart: Date.now(), limitPerWindow: 60, isRateLimited: false, retryAfterMs: null, lastRequestAt: null },
        config: { manualOnly: true, refreshIntervalMs: 5 * 60 * 1000, staleThresholdMs: 5 * 60 * 1000, maxRetries: 3, rateLimitPerWindow: 60, rateLimitWindowMs: 60_000 },
      };
      setSession(restoredSession);
      setIsStale(isSyncDataStale(restoredSession));

      // Reconcile
      const opPositions = getLivePositions();
      setReconciliation(reconcilePositions(storedPositions, opPositions));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleManualSync = async () => {
    const startedSession = beginSync(session);
    setSession(startedSession);

    if (startedSession.state.syncStatus === 'RATE_LIMITED') return;

    const startTime = Date.now();
    try {
      // Fetch account from secure server-side API
      const [accountRes, posRes, fillsRes] = await Promise.all([
        fetch('/api/broker/account'),
        fetch('/api/broker/positions'),
        fetch('/api/broker/fills'),
      ]);

      const accountData = await accountRes.json();
      const posData = await posRes.json();
      const fillData = await fillsRes.json();

      // These will be null/empty until a real broker is configured
      const newAccount: BrokerAccount | null = accountData.account ?? null;
      const newPositions: BrokerPosition[] = posData.positions ?? [];
      const newFills: BrokerFill[] = fillData.fills ?? [];

      const duration = Date.now() - startTime;
      const completedSession = completeSyncSuccess(startedSession, duration);
      setSession(completedSession);
      setAccount(newAccount);
      setPositions(newPositions);
      setFills(newFills);
      setIsStale(false);

      // Update reconciliation
      const opPositions = getLivePositions();
      setReconciliation(reconcilePositions(newPositions, opPositions));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown sync error';
      setSession(completeSyncFailure(startedSession, errMsg));
    }
  };

  const handleUserReviewed = (record: ReconciliationRecord) => {
    setReconciliation(prev =>
      prev.map(r => r === record ? { ...r, reviewedByUser: true } : r)
    );
  };

  const handleDisconnect = () => {
    clearAllBrokerData();
    setAccount(null);
    setPositions([]);
    setOrders([]);
    setFills([]);
    setReconciliation([]);
    setSession(createSyncSession('NONE'));
  };

  const emptyGreeks = { netDelta: 0, netGamma: 0, netTheta: 0, netVega: 0, netRho: 0, dollarDelta: 0, dollarGamma: 0, dollarTheta: 0, dollarVega: 0 };

  return (
    <div className="card animate-fade-in" style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Broker & Account</h2>
          <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
            Read-only broker integration. No order submission, modification, or cancellation.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(52,211,153,0.1)', border: '1px solid #34d399', borderRadius: '4px', color: '#34d399', fontWeight: 600 }}>
            🔒 READ-ONLY ACCESS
          </div>
          <div style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(248,113,113,0.1)', border: '1px solid #f87171', borderRadius: '4px', color: '#f87171', fontWeight: 600 }}>
            NO ORDER SUBMISSION
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div style={{ marginBottom: '1rem' }}>
        <BrokerConnectionStatus syncSession={session} onManualSync={handleManualSync} />
      </div>

      {/* Sync Status */}
      <div style={{ marginBottom: '1rem' }}>
        <BrokerSyncStatus session={session} />
      </div>

      {/* Warnings */}
      <BrokerDataWarnings warnings={warnings} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 14px',
              background: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: activeTab === tab.id ? '#fff' : 'var(--text-primary)',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: activeTab === tab.id ? 600 : 400, fontSize: '0.85rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <AccountOverview account={account} greeks={emptyGreeks} />}
      {activeTab === 'balances' && <AccountBalances account={account} />}
      {activeTab === 'positions' && <BrokerPositions positions={positions} />}
      {activeTab === 'orders' && <BrokerOrders orders={orders} />}
      {activeTab === 'fills' && <BrokerFills fills={fills} />}
      {activeTab === 'reconciliation' && (
        <ReconciliationPanel records={reconciliation} onUserReviewed={handleUserReviewed} />
      )}
      {activeTab === 'settings' && (
        <div>
          <h3>Broker Settings</h3>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem' }}>Configuration</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Broker credentials are configured <strong>server-side only</strong> via environment variables.
              They are never stored in the browser, localStorage, or client-side state.
            </p>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
              <div>Set <code>BROKER_API_KEY</code> in your server environment.</div>
              <div>Set <code>BROKER_PROVIDER</code> to your broker name (e.g., <code>tradier</code>).</div>
              <div style={{ color: '#f87171' }}>⚠ Never enter API keys in the browser interface.</div>
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(248,113,113,0.05)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', color: '#f87171' }}>Security Guarantees</h4>
            <ul style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, paddingLeft: '1.2rem', lineHeight: '1.8' }}>
              <li>READ-ONLY ACCESS — no order submission</li>
              <li>NO ORDER MODIFICATION — OptionPlus cannot change orders</li>
              <li>NO ORDER CANCELLATION — OptionPlus cannot cancel orders</li>
              <li>Credentials never appear in browser state or logs</li>
              <li>No automated trading or autonomous order routing</li>
            </ul>
          </div>

          {(account || positions.length > 0) && (
            <button
              onClick={handleDisconnect}
              style={{ padding: '8px 20px', background: '#f87171', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              Clear Broker Data
            </button>
          )}
        </div>
      )}
    </div>
  );
};
