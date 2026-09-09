// Phase 20: Position Import & Reconciliation Engine
// Imports actual broker positions and compares to OptionPlus tracked positions.
// Never auto-corrects discrepancies — requires explicit user confirmation.

import {
  BrokerPosition,
  ReconciliationRecord,
  ReconciliationState,
  ReconciliationField,
} from './types';
import { makeBrokerValue, makeUnavailableValue } from './accountParser';
import { LivePosition } from '../positions/types';

const STALE_POSITION_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Parse a raw broker position object into a typed BrokerPosition.
 * All values carry provenance metadata.
 */
export function parseBrokerPosition(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>,
  provider: string,
  endpoint: string
): BrokerPosition {
  const now = Date.now();

  const getNum = (key: string) =>
    typeof raw[key] === 'number'
      ? makeBrokerValue<number>(raw[key] as number, provider, endpoint, now)
      : makeUnavailableValue<number>(provider, endpoint);

  const qty: number = typeof raw['quantity'] === 'number' ? raw['quantity'] : 0;
  const symbol: string = typeof raw['symbol'] === 'string' ? raw['symbol'] : 'UNKNOWN';
  const underlying: string =
    typeof raw['underlying'] === 'string'
      ? raw['underlying']
      : symbol.slice(0, 4); // best-effort

  const optionType: 'call' | 'put' | 'stock' | null =
    raw['option_type'] === 'call'
      ? 'call'
      : raw['option_type'] === 'put'
      ? 'put'
      : raw['option_type'] === 'stock'
      ? 'stock'
      : null;

  const strike: number | null =
    typeof raw['strike'] === 'number' ? raw['strike'] : null;
  const expiration: string | null =
    typeof raw['expiration'] === 'string' ? raw['expiration'] : null;

  return {
    brokerId: typeof raw['id'] === 'string' ? raw['id'] : `broker-${now}`,
    symbol,
    underlying,
    optionType,
    strike,
    expiration,
    quantity: qty,
    averageCost: getNum('average_cost'),
    marketValue: getNum('market_value'),
    unrealizedPnL: getNum('unrealized_pnl'),
    realizedPnL: getNum('realized_pnl'),
    currency: typeof raw['currency'] === 'string' ? raw['currency'] : 'USD',
    source: 'BROKER_IMPORTED',
    retrievedAt: now,
    provider,
  };
}

/** Determine if broker position data is stale. */
function isBrokerPositionStale(pos: BrokerPosition): boolean {
  return Date.now() - pos.retrievedAt > STALE_POSITION_THRESHOLD_MS;
}

/**
 * Reconcile broker positions vs OptionPlus live positions.
 * Detects mismatches without auto-correcting anything.
 */
export function reconcilePositions(
  brokerPositions: BrokerPosition[],
  optionplusPositions: LivePosition[]
): ReconciliationRecord[] {
  const records: ReconciliationRecord[] = [];
  const matchedOpIds = new Set<string>();

  for (const bp of brokerPositions) {
    const stale = isBrokerPositionStale(bp);

    if (stale) {
      records.push({
        state: 'STALE',
        brokerPosition: bp,
        optionplusPositionId: null,
        discrepancies: [],
        staleBrokerData: true,
        reviewedByUser: false,
        explanation: `Broker position data for ${bp.symbol} is stale and may not reflect current state.`,
      });
      continue;
    }

    // Try to find a matching OptionPlus position
    const match = optionplusPositions.find((op) => {
      if (op.status === 'CLOSED') return false;
      const planLegs = op.plan?.legs ?? [];
      return planLegs.some(
        (l) =>
          l.strike === bp.strike &&
          (bp.expiration ? op.plan?.expiration === bp.expiration : true) &&
          (bp.optionType ? l.type === bp.optionType : true) &&
          op.underlying === bp.underlying
      );
    });

    if (!match) {
      records.push({
        state: 'BROKER_ONLY',
        brokerPosition: bp,
        optionplusPositionId: null,
        discrepancies: [],
        staleBrokerData: false,
        reviewedByUser: false,
        explanation: `Position ${bp.symbol} exists at the broker but has no matching OptionPlus record.`,
      });
      continue;
    }

    matchedOpIds.add(match.id);

    // Check for discrepancies
    const discrepancies: ReconciliationField[] = [];

    // Quantity check
    const opQty = match.fills.reduce((sum, f) => sum + f.quantity, 0);
    if (Math.abs(opQty - Math.abs(bp.quantity)) > 0.001) {
      discrepancies.push({
        field: 'quantity',
        brokerValue: bp.quantity,
        optionplusValue: opQty,
        match: false,
      });
    }

    // Strike check
    const planStrike = match.plan?.legs?.[0]?.strike ?? null;
    if (bp.strike !== null && planStrike !== null && bp.strike !== planStrike) {
      discrepancies.push({
        field: 'strike',
        brokerValue: bp.strike,
        optionplusValue: planStrike,
        match: false,
      });
    }

    // Expiration check
    const planExp = match.plan?.expiration ?? null;
    if (bp.expiration && planExp && bp.expiration !== planExp) {
      discrepancies.push({
        field: 'expiration',
        brokerValue: bp.expiration,
        optionplusValue: planExp,
        match: false,
      });
    }

    // Option type check
    const planType = match.plan?.legs?.[0]?.type ?? null;
    if (bp.optionType && planType && bp.optionType !== planType) {
      discrepancies.push({
        field: 'optionType',
        brokerValue: bp.optionType,
        optionplusValue: planType,
        match: false,
      });
    }

    const state: ReconciliationState = discrepancies.length === 0 ? 'MATCH' : 'MISMATCH';

    records.push({
      state,
      brokerPosition: bp,
      optionplusPositionId: match.id,
      discrepancies,
      staleBrokerData: false,
      reviewedByUser: false,
      explanation:
        state === 'MATCH'
          ? `Position ${bp.symbol} matches the OptionPlus record.`
          : `Position ${bp.symbol} has ${discrepancies.length} discrepancy(ies) requiring review.`,
    });
  }

  // Any OptionPlus positions not matched by broker = OPTIONPLUS_ONLY
  for (const op of optionplusPositions) {
    if (op.status === 'CLOSED') continue;
    if (!matchedOpIds.has(op.id)) {
      records.push({
        state: 'OPTIONPLUS_ONLY',
        brokerPosition: null,
        optionplusPositionId: op.id,
        discrepancies: [],
        staleBrokerData: false,
        reviewedByUser: false,
        explanation: `OptionPlus position ${op.id} (${op.underlying}) has no matching broker record. It may be a planned or hypothetical position.`,
      });
    }
  }

  return records;
}

/** Converts a broker fill import into a format suitable for journaling. */
export function describeReconciliationState(state: ReconciliationState): string {
  switch (state) {
    case 'MATCH': return 'Broker and OptionPlus records agree.';
    case 'BROKER_ONLY': return 'This position exists at the broker but not in OptionPlus.';
    case 'OPTIONPLUS_ONLY': return 'This position is tracked in OptionPlus but not found at the broker.';
    case 'MISMATCH': return 'The broker and OptionPlus records differ. Manual review required.';
    case 'STALE': return 'Broker data is too old to compare reliably.';
    case 'INSUFFICIENT_DATA': return 'Insufficient data to perform reconciliation.';
  }
}
