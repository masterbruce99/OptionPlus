// Phase 20: Fill History Import Engine
// Parses actual broker fills. Never infers fills from quotes or midpoints.
// Connects to Phase 18 lifecycle and Phase 13 journaling.

import { BrokerFill, DataSource } from './types';
import { makeBrokerValue, makeUnavailableValue } from './accountParser';

/**
 * Parse a raw broker fill record into a typed BrokerFill.
 * All monetary values carry explicit provenance.
 */
export function parseBrokerFill(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>,
  provider: string,
  endpoint: string
): BrokerFill | null {
  const now = Date.now();

  // Required fields — if missing, we cannot construct a valid fill
  if (typeof raw['execution_id'] !== 'string') return null;
  if (typeof raw['fill_price'] !== 'number') return null;
  if (typeof raw['quantity'] !== 'number') return null;
  if (typeof raw['symbol'] !== 'string') return null;

  const side: 'buy' | 'sell' =
    raw['side'] === 'sell' ? 'sell' : 'buy';

  const timestamp: number =
    typeof raw['timestamp'] === 'number'
      ? raw['timestamp']
      : typeof raw['timestamp'] === 'string'
      ? new Date(raw['timestamp']).getTime()
      : now;

  const fees =
    typeof raw['fees'] === 'number'
      ? makeBrokerValue<number>(raw['fees'] as number, provider, endpoint, now)
      : makeUnavailableValue<number>(provider, endpoint);

  return {
    executionId: raw['execution_id'] as string,
    orderId: typeof raw['order_id'] === 'string' ? raw['order_id'] : 'UNKNOWN',
    timestamp,
    symbol: raw['symbol'] as string,
    underlying:
      typeof raw['underlying'] === 'string'
        ? raw['underlying']
        : (raw['symbol'] as string).slice(0, 4),
    side,
    quantity: raw['quantity'] as number,
    fillPrice: raw['fill_price'] as number,
    fees,
    currency: typeof raw['currency'] === 'string' ? raw['currency'] : 'USD',
    provider,
    source: 'BROKER_IMPORTED' as DataSource,
  };
}

/**
 * Parse an array of raw fill records, skipping any that are invalid.
 * Logs skipped count but does not fabricate fills.
 */
export function parseBrokerFills(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawFills: Record<string, any>[],
  provider: string,
  endpoint: string
): { fills: BrokerFill[]; skippedCount: number } {
  const fills: BrokerFill[] = [];
  let skippedCount = 0;

  for (const raw of rawFills) {
    const fill = parseBrokerFill(raw, provider, endpoint);
    if (fill) {
      fills.push(fill);
    } else {
      skippedCount++;
    }
  }

  return { fills, skippedCount };
}

/**
 * Links a broker fill to an existing OptionPlus position by matching the underlying
 * and approximate fill time. Returns the matched position ID or null.
 * Never creates a position automatically from a fill.
 */
export function matchFillToPosition(
  fill: BrokerFill,
  positionIds: Array<{ id: string; underlying: string; enteredAt: number | null }>
): string | null {
  for (const pos of positionIds) {
    if (pos.underlying !== fill.underlying) continue;
    if (pos.enteredAt !== null) {
      const diffMs = Math.abs(fill.timestamp - pos.enteredAt);
      // If fill and entry are within 5 minutes, consider matched
      if (diffMs < 5 * 60 * 1000) return pos.id;
    }
  }
  return null;
}

/**
 * Converts a broker fill into a journal-linkable description.
 * Always marked BROKER_IMPORTED — never silently merges.
 */
export function describeFillForJournal(fill: BrokerFill): string {
  const feeStr =
    fill.fees.value !== null
      ? ` (fees: ${fill.currency} ${fill.fees.value.toFixed(2)})`
      : ' (fees: UNAVAILABLE)';
  return (
    `[BROKER-IMPORTED] ${fill.side.toUpperCase()} ${fill.quantity}x ${fill.symbol} ` +
    `@ ${fill.currency} ${fill.fillPrice.toFixed(2)}${feeStr} ` +
    `on ${new Date(fill.timestamp).toISOString()} via ${fill.provider}`
  );
}
