// Phase 20: Account Parsing & Data Provenance Engine
// Parses raw broker API responses into the BrokerAccount / BrokerValue models.
// Preserves provenance: every field knows its source, timestamp, and freshness.

import {
  BrokerAccount,
  BrokerAccountField,
  BrokerValue,
} from './types';
import { DataAvailabilityStatus } from '../data-infrastructure/types';

export const UNAVAILABLE_FIELD = 'UNAVAILABLE';

export function makeBrokerValue<T>(
  value: T | null | undefined,
  provider: string,
  endpoint: string,
  retrievedAt: number
): BrokerValue<T> {
  const isAvailable = value !== null && value !== undefined;
  return {
    value: isAvailable ? (value as T) : null,
    source: isAvailable ? 'BROKER_REPORTED' : 'UNAVAILABLE',
    retrievedAt,
    freshness: isAvailable ? 'FRESH' : 'UNAVAILABLE',
    status: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
    provider,
    endpoint,
  };
}

export function makeUnavailableValue<T>(
  provider: string,
  endpoint: string
): BrokerValue<T> {
  return {
    value: null,
    source: 'UNAVAILABLE',
    retrievedAt: null,
    freshness: 'UNAVAILABLE',
    status: 'UNAVAILABLE',
    provider,
    endpoint,
  };
}

function makeField(
  amount: BrokerValue<number>,
  currency: string
): BrokerAccountField {
  return { amount, currency };
}

/**
 * Parses a raw broker account response (unknown shape) into a typed BrokerAccount.
 * Every missing field is explicitly marked UNAVAILABLE — never defaulted to 0.
 */
export function parseBrokerAccount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any> | null | undefined,
  provider: string,
  endpoint: string
): BrokerAccount {
  const now = Date.now();
  const get = (key: string) =>
    raw && typeof raw[key] === 'number'
      ? makeBrokerValue<number>(raw[key] as number, provider, endpoint, now)
      : makeUnavailableValue<number>(provider, endpoint);

  const currency: string =
    raw && typeof raw['currency'] === 'string' ? raw['currency'] : 'UNKNOWN';

  // Account ID: redact to last 4 chars for logging safety
  const rawId: string | null =
    raw && typeof raw['account_id'] === 'string' ? raw['account_id'] : null;
  const redactedId: string | null = rawId
    ? `***${rawId.slice(-4)}`
    : null;

  return {
    accountId: makeBrokerValue<string>(redactedId, provider, endpoint, now),
    cashBalance:          makeField(get('cash_balance'), currency),
    netLiquidationValue:  makeField(get('net_liquidation_value'), currency),
    buyingPower:          makeField(get('buying_power'), currency),
    availableFunds:       makeField(get('available_funds'), currency),
    initialMarginReq:     makeField(get('initial_margin_requirement'), currency),
    maintenanceMarginReq: makeField(get('maintenance_margin_requirement'), currency),
    marginUsed:           makeField(get('margin_used'), currency),
    marginAvailable:      makeField(get('margin_available'), currency),
    settledCash:          makeField(get('settled_cash'), currency),
    currency,
    retrievedAt: now,
    provider,
  };
}

/** Check if a broker value is available (non-null, non-UNAVAILABLE). */
export function isBrokerValueAvailable<T>(bv: BrokerValue<T>): boolean {
  return bv.status === 'AVAILABLE' && bv.value !== null;
}

/** Returns a human-readable display string for a broker money value. */
export function formatBrokerMoney(
  field: BrokerAccountField
): string {
  if (!isBrokerValueAvailable(field.amount)) {
    return 'INSUFFICIENT BROKER DATA';
  }
  const val = field.amount.value!;
  return `${field.currency} ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Redacts any secret-looking value from a loggable string. */
export function redactSecrets(input: string): string {
  // Replace anything that looks like an API key or token
  return input
    .replace(/([Aa]pi[-_]?[Kk]ey\s*[:=]\s*)["']?[^\s"',}]+["']?/g, '$1[REDACTED]')
    .replace(/([Tt]oken\s*[:=]\s*)["']?[^\s"',}]+["']?/g, '$1[REDACTED]')
    .replace(/([Pp]assword\s*[:=]\s*)["']?[^\s"',}]+["']?/g, '$1[REDACTED]')
    .replace(/([Ss]ecret\s*[:=]\s*)["']?[^\s"',}]+["']?/g, '$1[REDACTED]')
    .replace(/([Bb]earer\s+)[^\s]+/g, '$1[REDACTED]');
}

/** Mark a BrokerValue as stale if its retrievedAt is older than thresholdMs. */
export function applyFreshnessCheck<T>(
  bv: BrokerValue<T>,
  thresholdMs: number
): BrokerValue<T> {
  if (bv.retrievedAt === null) return { ...bv, freshness: 'UNAVAILABLE' };
  const ageMs = Date.now() - bv.retrievedAt;
  if (ageMs > thresholdMs) return { ...bv, freshness: 'STALE' };
  return bv;
}

/** Validates that an account has at minimum the buying power field available. */
export function validateAccountCompleteness(
  account: BrokerAccount
): { complete: boolean; missing: string[] } {
  const fields: [string, DataAvailabilityStatus][] = [
    ['buyingPower', account.buyingPower.amount.status],
    ['netLiquidationValue', account.netLiquidationValue.amount.status],
    ['cashBalance', account.cashBalance.amount.status],
  ];
  const missing = fields.filter(([, s]) => s !== 'AVAILABLE').map(([name]) => name);
  return { complete: missing.length === 0, missing };
}
