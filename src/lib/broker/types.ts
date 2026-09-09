// Phase 20: Read-Only Broker & Account Connectivity — Types

import { DataAvailabilityStatus } from '../data-infrastructure/types';

export type BrokerConnectionState =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'AUTHENTICATION_ERROR'
  | 'PERMISSION_ERROR'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'STALE'
  | 'DISCONNECTED'
  | 'UNKNOWN';

export type DataSource =
  | 'BROKER_REPORTED'
  | 'OPTIONPLUS_USER_ENTERED'
  | 'OPTIONPLUS_CALCULATED'
  | 'HYPOTHETICAL'
  | 'BROKER_IMPORTED'
  | 'UNAVAILABLE';

export type DataFreshness = 'FRESH' | 'STALE' | 'UNKNOWN' | 'UNAVAILABLE';

// Every broker-derived value carries provenance metadata
export interface BrokerValue<T> {
  value: T | null;
  source: DataSource;
  retrievedAt: number | null;   // Unix ms
  freshness: DataFreshness;
  status: DataAvailabilityStatus;
  provider: string;             // e.g. "tradier", "tdameritrade", "mock"
  endpoint?: string;            // which API endpoint provided this
}

// -------------------------------------------------------
// Broker Capability Declaration
// -------------------------------------------------------
export interface BrokerCapabilities {
  accountInfo:      DataAvailabilityStatus;
  balances:         DataAvailabilityStatus;
  buyingPower:      DataAvailabilityStatus;
  margin:           DataAvailabilityStatus;
  openPositions:    DataAvailabilityStatus;
  openOrders:       DataAvailabilityStatus;
  orderHistory:     DataAvailabilityStatus;
  fillHistory:      DataAvailabilityStatus;
  transactions:     DataAvailabilityStatus;
  multiCurrency:    DataAvailabilityStatus;
}

// -------------------------------------------------------
// Account Model
// -------------------------------------------------------
export interface BrokerAccountField {
  amount: BrokerValue<number>;
  currency: string;
}

export interface BrokerAccount {
  accountId:            BrokerValue<string>;   // may be redacted
  cashBalance:          BrokerAccountField;
  netLiquidationValue:  BrokerAccountField;
  buyingPower:          BrokerAccountField;
  availableFunds:       BrokerAccountField;
  initialMarginReq:     BrokerAccountField;
  maintenanceMarginReq: BrokerAccountField;
  marginUsed:           BrokerAccountField;
  marginAvailable:      BrokerAccountField;
  settledCash:          BrokerAccountField;
  currency: string;
  retrievedAt: number | null;
  provider: string;
}

// -------------------------------------------------------
// Broker Position
// -------------------------------------------------------
export interface BrokerPosition {
  brokerId: string;                  // broker's own position ID
  symbol: string;                    // OCC-style option symbol or equity symbol
  underlying: string;
  optionType: 'call' | 'put' | 'stock' | null;
  strike: number | null;
  expiration: string | null;         // YYYY-MM-DD
  quantity: number;                  // positive = long, negative = short
  averageCost: BrokerValue<number>;
  marketValue: BrokerValue<number>;
  unrealizedPnL: BrokerValue<number>;
  realizedPnL: BrokerValue<number>;
  currency: string;
  source: DataSource;
  retrievedAt: number;
  provider: string;
}

// -------------------------------------------------------
// Reconciliation
// -------------------------------------------------------
export type ReconciliationState =
  | 'MATCH'
  | 'BROKER_ONLY'
  | 'OPTIONPLUS_ONLY'
  | 'MISMATCH'
  | 'STALE'
  | 'INSUFFICIENT_DATA';

export interface ReconciliationField {
  field: string;
  brokerValue: number | string | null;
  optionplusValue: number | string | null;
  match: boolean;
}

export interface ReconciliationRecord {
  state: ReconciliationState;
  brokerPosition: BrokerPosition | null;
  optionplusPositionId: string | null;
  discrepancies: ReconciliationField[];
  staleBrokerData: boolean;
  reviewedByUser: boolean;
  explanation: string;
}

// -------------------------------------------------------
// Fills
// -------------------------------------------------------
export interface BrokerFill {
  executionId: string;
  orderId: string;
  timestamp: number;
  symbol: string;
  underlying: string;
  side: 'buy' | 'sell';
  quantity: number;
  fillPrice: number;
  fees: BrokerValue<number>;
  currency: string;
  provider: string;
  source: DataSource;
}

// -------------------------------------------------------
// Orders (read-only display)
// -------------------------------------------------------
export type BrokerOrderStatus =
  | 'OPEN'
  | 'FILLED'
  | 'PARTIALLY_FILLED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'UNKNOWN';

export interface BrokerOrder {
  orderId: string;
  timestamp: number;
  symbol: string;
  strategyDescription: string | null;    // only if deterministically identifiable
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit' | 'unknown';
  limitPrice: number | null;
  status: BrokerOrderStatus;
  filledQuantity: number;
  averageFillPrice: BrokerValue<number>;
  cancelledOrRejectedReason: string | null;
  source: DataSource;
  provider: string;
  retrievedAt: number;
}

// -------------------------------------------------------
// Sync Engine
// -------------------------------------------------------
export type SyncStatus =
  | 'IDLE'
  | 'SYNCING'
  | 'SUCCESS'
  | 'PARTIAL'
  | 'FAILED'
  | 'RATE_LIMITED'
  | 'STALE';

export interface BrokerSyncState {
  connectionState: BrokerConnectionState;
  syncStatus: SyncStatus;
  lastSuccessfulSync: number | null;  // Unix ms
  syncDurationMs: number | null;
  retryCount: number;
  retryAfterMs: number | null;
  errorMessage: string | null;
  provider: string;
}

// -------------------------------------------------------
// Rate Limiting
// -------------------------------------------------------
export interface RateLimitState {
  requestCount: number;
  windowStart: number;
  limitPerWindow: number;
  isRateLimited: boolean;
  retryAfterMs: number | null;
  lastRequestAt: number | null;
}

// -------------------------------------------------------
// Broker Provider Interface (Server-Side Only)
// -------------------------------------------------------
export interface BrokerProvider {
  readonly name: string;
  readonly capabilities: BrokerCapabilities;

  // All methods are read-only.
  // Credentials must live server-side and never be returned to client.
  getConnectionState(): Promise<BrokerConnectionState>;
  getAccount(): Promise<BrokerAccount>;
  getPositions(): Promise<BrokerPosition[]>;
  getOpenOrders(): Promise<BrokerOrder[]>;
  getOrderHistory(days?: number): Promise<BrokerOrder[]>;
  getFillHistory(days?: number): Promise<BrokerFill[]>;

  // SECURITY GUARANTEE: None of the following exist.
  // placeOrder — NOT IMPLEMENTED
  // modifyOrder — NOT IMPLEMENTED
  // cancelOrder — NOT IMPLEMENTED
  // replaceOrder — NOT IMPLEMENTED
  // exerciseOption — NOT IMPLEMENTED
  // transferFunds — NOT IMPLEMENTED
}
