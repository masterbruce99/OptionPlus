// Phase 20: Broker Sync Engine
// Controls synchronization lifecycle: manual, interval, stale detection, retry.
// Never exposes credentials. Never initiates writes to broker.

import {
  BrokerSyncState,
  SyncStatus,
  BrokerConnectionState,
  RateLimitState,
} from './types';
import {
  transitionSyncState,
  calculateBackoffMs,
  checkRateLimit,
} from './connectionEngine';

export interface SyncConfig {
  manualOnly: boolean;           // If true, only sync when user explicitly requests
  refreshIntervalMs: number;    // Auto-refresh interval (ignored if manualOnly)
  staleThresholdMs: number;     // How old before STALE
  maxRetries: number;
  rateLimitPerWindow: number;   // Max requests per window
  rateLimitWindowMs: number;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  manualOnly: true,             // Default: user must trigger sync manually
  refreshIntervalMs: 5 * 60 * 1000, // 5 minutes if auto
  staleThresholdMs: 5 * 60 * 1000,
  maxRetries: 3,
  rateLimitPerWindow: 60,
  rateLimitWindowMs: 60_000,
};

export interface SyncSession {
  state: BrokerSyncState;
  rateLimit: RateLimitState;
  config: SyncConfig;
}

export function createSyncSession(provider: string, config?: Partial<SyncConfig>): SyncSession {
  const mergedConfig = { ...DEFAULT_SYNC_CONFIG, ...config };
  return {
    state: {
      connectionState: 'NOT_CONFIGURED' as BrokerConnectionState,
      syncStatus: 'IDLE' as SyncStatus,
      lastSuccessfulSync: null,
      syncDurationMs: null,
      retryCount: 0,
      retryAfterMs: null,
      errorMessage: null,
      provider,
    },
    rateLimit: {
      requestCount: 0,
      windowStart: Date.now(),
      limitPerWindow: mergedConfig.rateLimitPerWindow,
      isRateLimited: false,
      retryAfterMs: null,
      lastRequestAt: null,
    },
    config: mergedConfig,
  };
}

export function beginSync(session: SyncSession): SyncSession {
  const allowed = checkRateLimit(session.rateLimit, session.config.rateLimitWindowMs);

  if (!allowed) {
    return {
      ...session,
      state: transitionSyncState(session.state, {
        syncStatus: 'RATE_LIMITED',
        connectionState: 'RATE_LIMITED',
        retryAfterMs: session.rateLimit.retryAfterMs,
        errorMessage: `Rate limited. Retry after ${Math.ceil((session.rateLimit.retryAfterMs ?? 0) / 1000)}s.`,
      }),
    };
  }

  return {
    ...session,
    state: transitionSyncState(session.state, {
      syncStatus: 'SYNCING',
      connectionState: 'CONNECTING',
      errorMessage: null,
    }),
  };
}

export function completeSyncSuccess(session: SyncSession, durationMs: number): SyncSession {
  return {
    ...session,
    state: transitionSyncState(session.state, {
      syncStatus: 'SUCCESS',
      connectionState: 'CONNECTED',
      lastSuccessfulSync: Date.now(),
      syncDurationMs: durationMs,
      retryCount: 0,
      retryAfterMs: null,
      errorMessage: null,
    }),
  };
}

export function completeSyncFailure(
  session: SyncSession,
  reason: string,
  isRateLimit = false
): SyncSession {
  const newRetryCount = session.state.retryCount + 1;
  const backoffMs = calculateBackoffMs(newRetryCount);
  const connectionState: BrokerConnectionState = isRateLimit ? 'RATE_LIMITED' : 'PROVIDER_ERROR';

  return {
    ...session,
    state: transitionSyncState(session.state, {
      syncStatus: isRateLimit ? 'RATE_LIMITED' : 'FAILED',
      connectionState,
      retryCount: newRetryCount,
      retryAfterMs: newRetryCount < session.config.maxRetries ? backoffMs : null,
      errorMessage: reason,
    }),
  };
}

/** Evaluates whether a new sync is needed based on config and current state. */
export function shouldAutoSync(session: SyncSession): boolean {
  if (session.config.manualOnly) return false;
  if (session.state.syncStatus === 'SYNCING') return false;
  if (session.state.connectionState === 'RATE_LIMITED') return false;
  if (session.state.lastSuccessfulSync === null) return true;

  const ageMs = Date.now() - session.state.lastSuccessfulSync;
  return ageMs > session.config.refreshIntervalMs;
}

/** Checks if data is stale based on last successful sync. */
export function isSyncDataStale(session: SyncSession): boolean {
  if (session.state.lastSuccessfulSync === null) return true;
  const ageMs = Date.now() - session.state.lastSuccessfulSync;
  return ageMs > session.config.staleThresholdMs;
}

/** Returns a user-facing sync status description. */
export function describeSyncStatus(session: SyncSession): string {
  const state = session.state;
  if (state.syncStatus === 'SYNCING') return 'Synchronizing account data…';
  if (state.syncStatus === 'RATE_LIMITED') {
    const waitSec = state.retryAfterMs ? Math.ceil(state.retryAfterMs / 1000) : '?';
    return `Rate limited by broker. Retry in ${waitSec}s.`;
  }
  if (state.syncStatus === 'FAILED') return `Sync failed: ${state.errorMessage ?? 'Unknown error'}`;
  if (state.syncStatus === 'SUCCESS' && state.lastSuccessfulSync) {
    const ageMs = Date.now() - state.lastSuccessfulSync;
    const ageSec = Math.floor(ageMs / 1000);
    if (ageSec < 60) return `Last synced ${ageSec}s ago`;
    const ageMin = Math.floor(ageSec / 60);
    return `Last synced ${ageMin}m ago`;
  }
  if (state.connectionState === 'NOT_CONFIGURED') return 'No broker configured.';
  return 'Idle';
}
