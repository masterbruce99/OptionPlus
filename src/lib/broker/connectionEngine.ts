// Phase 20: Broker Connection State Engine
// Deterministic connection state management with freshness tracking.
// Server-side only — never exposes credentials.

import {
  BrokerConnectionState,
  BrokerSyncState,
  RateLimitState,
  SyncStatus,
} from './types';

// Stale threshold: if last sync was more than this many ms ago, mark STALE
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function createInitialSyncState(provider: string): BrokerSyncState {
  return {
    connectionState: 'NOT_CONFIGURED',
    syncStatus: 'IDLE',
    lastSuccessfulSync: null,
    syncDurationMs: null,
    retryCount: 0,
    retryAfterMs: null,
    errorMessage: null,
    provider,
  };
}

export function evaluateConnectionFreshness(
  state: BrokerSyncState
): BrokerConnectionState {
  if (state.connectionState !== 'CONNECTED') return state.connectionState;

  if (state.lastSuccessfulSync === null) return 'STALE';

  const ageMs = Date.now() - state.lastSuccessfulSync;
  if (ageMs > STALE_THRESHOLD_MS) return 'STALE';

  return 'CONNECTED';
}

export function createInitialRateLimitState(limitPerWindow: number): RateLimitState {
  return {
    requestCount: 0,
    windowStart: Date.now(),
    limitPerWindow,
    isRateLimited: false,
    retryAfterMs: null,
    lastRequestAt: null,
  };
}

/** Returns true if the request is allowed; false if rate-limited. */
export function checkRateLimit(state: RateLimitState, windowMs = 60_000): boolean {
  const now = Date.now();

  // Reset window if it has expired
  if (now - state.windowStart > windowMs) {
    state.requestCount = 0;
    state.windowStart = now;
    state.isRateLimited = false;
    state.retryAfterMs = null;
  }

  if (state.requestCount >= state.limitPerWindow) {
    state.isRateLimited = true;
    state.retryAfterMs = windowMs - (now - state.windowStart);
    return false;
  }

  state.requestCount += 1;
  state.lastRequestAt = now;
  return true;
}

/** Calculates exponential backoff delay in ms (max 5 minutes). */
export function calculateBackoffMs(retryCount: number): number {
  const base = 1000; // 1 second
  const max = 5 * 60 * 1000; // 5 minutes
  return Math.min(base * Math.pow(2, retryCount), max);
}

export function transitionSyncState(
  current: BrokerSyncState,
  next: Partial<BrokerSyncState>
): BrokerSyncState {
  return { ...current, ...next };
}

/** Constructs a human-readable explanation for a given connection state. */
export function explainConnectionState(state: BrokerConnectionState): string {
  switch (state) {
    case 'NOT_CONFIGURED':
      return 'No broker has been configured. Add your broker credentials in Settings to connect.';
    case 'CONFIGURED':
      return 'Broker credentials are configured but a connection has not been established yet.';
    case 'CONNECTING':
      return 'OptionPlus is attempting to connect to your broker. Please wait.';
    case 'CONNECTED':
      return 'Successfully connected to the broker. Account data is current.';
    case 'AUTHENTICATION_ERROR':
      return 'The broker rejected the authentication credentials. Verify that your API key is correct and has not expired.';
    case 'PERMISSION_ERROR':
      return 'The broker accepted the credentials but the account does not have permission for the requested data. Check that read-only market data access is enabled.';
    case 'RATE_LIMITED':
      return 'The broker has temporarily limited requests due to too many API calls. OptionPlus will retry automatically after the required wait period.';
    case 'PROVIDER_ERROR':
      return 'The broker returned an unexpected error. This may be a temporary service disruption. OptionPlus will retry automatically.';
    case 'STALE':
      return 'Account data has not been refreshed recently. The displayed values may not reflect current market conditions. Trigger a manual sync to update.';
    case 'DISCONNECTED':
      return 'The connection to the broker was lost. OptionPlus will attempt to reconnect.';
    case 'UNKNOWN':
      return 'The broker connection state could not be determined. Check your network connection and broker credentials.';
  }
}

export function syncStatusToConnectionState(status: SyncStatus): BrokerConnectionState {
  switch (status) {
    case 'SUCCESS': return 'CONNECTED';
    case 'FAILED': return 'PROVIDER_ERROR';
    case 'RATE_LIMITED': return 'RATE_LIMITED';
    case 'STALE': return 'STALE';
    default: return 'UNKNOWN';
  }
}
