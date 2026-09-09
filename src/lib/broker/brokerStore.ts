// Phase 20: Broker Store — Client-Side State (No Credentials)
// Manages broker sync state and imported data on the client.
// Credentials are NEVER stored or passed through this module.

import {
  BrokerSyncState,
  BrokerAccount,
  BrokerPosition,
  BrokerOrder,
  BrokerFill,
  BrokerConnectionState,
} from './types';

// ---------------------------------------------------------------------------
// In-Memory Store (localStorage fallback for persistence across reloads)
// ---------------------------------------------------------------------------

const STORE_KEY_SYNC = 'optionplus_broker_sync';
const STORE_KEY_ACCOUNT = 'optionplus_broker_account';
const STORE_KEY_POSITIONS = 'optionplus_broker_positions';

// ---------------------------------------------------------------------------
// Sync State
// ---------------------------------------------------------------------------
let _syncState: BrokerSyncState = {
  connectionState: 'NOT_CONFIGURED',
  syncStatus: 'IDLE',
  lastSuccessfulSync: null,
  syncDurationMs: null,
  retryCount: 0,
  retryAfterMs: null,
  errorMessage: null,
  provider: 'NONE',
};

export function getBrokerSyncState(): BrokerSyncState {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORE_KEY_SYNC);
    if (stored) {
      try {
        return JSON.parse(stored) as BrokerSyncState;
      } catch {
        // Corrupt storage — fall through
      }
    }
  }
  return _syncState;
}

export function saveBrokerSyncState(state: BrokerSyncState): void {
  _syncState = state;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORE_KEY_SYNC, JSON.stringify(state));
  }
}

export function getBrokerConnectionState(): BrokerConnectionState {
  return getBrokerSyncState().connectionState;
}

// ---------------------------------------------------------------------------
// Account Data
// ---------------------------------------------------------------------------
let _account: BrokerAccount | null = null;

export function getBrokerAccount(): BrokerAccount | null {
  if (_account) return _account;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORE_KEY_ACCOUNT);
    if (stored) {
      try {
        return JSON.parse(stored) as BrokerAccount;
      } catch {
        // Corrupt storage
      }
    }
  }
  return null;
}

export function saveBrokerAccount(account: BrokerAccount): void {
  _account = account;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORE_KEY_ACCOUNT, JSON.stringify(account));
  }
}

export function clearBrokerAccount(): void {
  _account = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORE_KEY_ACCOUNT);
  }
}

// ---------------------------------------------------------------------------
// Broker Positions
// ---------------------------------------------------------------------------
let _positions: BrokerPosition[] = [];

export function getBrokerPositions(): BrokerPosition[] {
  if (_positions.length > 0) return _positions;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORE_KEY_POSITIONS);
    if (stored) {
      try {
        return JSON.parse(stored) as BrokerPosition[];
      } catch {
        // Corrupt storage
      }
    }
  }
  return [];
}

export function saveBrokerPositions(positions: BrokerPosition[]): void {
  _positions = positions;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORE_KEY_POSITIONS, JSON.stringify(positions));
  }
}

// ---------------------------------------------------------------------------
// Orders & Fills (session-only, not persisted for security)
// ---------------------------------------------------------------------------
let _orders: BrokerOrder[] = [];
let _fills: BrokerFill[] = [];

export function getBrokerOrders(): BrokerOrder[] { return _orders; }
export function saveBrokerOrders(orders: BrokerOrder[]): void { _orders = orders; }

export function getBrokerFills(): BrokerFill[] { return _fills; }
export function saveBrokerFills(fills: BrokerFill[]): void { _fills = fills; }

// ---------------------------------------------------------------------------
// Clear everything (e.g., on disconnect)
// ---------------------------------------------------------------------------
export function clearAllBrokerData(): void {
  _syncState = {
    connectionState: 'NOT_CONFIGURED',
    syncStatus: 'IDLE',
    lastSuccessfulSync: null,
    syncDurationMs: null,
    retryCount: 0,
    retryAfterMs: null,
    errorMessage: null,
    provider: 'NONE',
  };
  _account = null;
  _positions = [];
  _orders = [];
  _fills = [];

  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORE_KEY_SYNC);
    localStorage.removeItem(STORE_KEY_ACCOUNT);
    localStorage.removeItem(STORE_KEY_POSITIONS);
  }
}
