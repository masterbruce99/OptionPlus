import { ExecutionQuality } from './types';
import { LegMarketContext } from './limitPriceEngine';

export interface EntryValidationResult {
  status: ExecutionQuality;
  reasons: string[];
}

export function validateEntry(
  legContexts: LegMarketContext[], 
  underlyingPrice: number | null
): EntryValidationResult {
  const reasons: string[] = [];
  let status: ExecutionQuality = 'READY';

  if (underlyingPrice === null) {
    return {
      status: 'INSUFFICIENT_DATA',
      reasons: ['Underlying price is unavailable.']
    };
  }

  if (legContexts.length === 0) {
    return {
      status: 'BLOCKED',
      reasons: ['No legs configured for this trade plan.']
    };
  }

  let missingQuotes = false;
  let wideSpreads = false;
  let staleQuotes = false;

  for (const ctx of legContexts) {
    if (ctx.bid === null || ctx.ask === null) {
      missingQuotes = true;
      continue;
    }

    if (ctx.bid === 0 && ctx.ask === 0) {
      staleQuotes = true;
      continue;
    }

    const spread = ctx.ask - ctx.bid;
    const spreadPercentage = spread / ctx.ask;

    if (spreadPercentage > 0.15 || spread > 0.5) { // 15% of ask or 50 cents
      wideSpreads = true;
    }
  }

  if (missingQuotes) {
    return {
      status: 'INSUFFICIENT_DATA',
      reasons: ['One or more legs have missing bid/ask quotes.']
    };
  }

  if (staleQuotes) {
    status = 'BLOCKED';
    reasons.push('Stale quotes detected (0 bid/0 ask). Execution is blocked.');
  } else if (wideSpreads) {
    status = 'CAUTION';
    reasons.push('One or more legs have a wide bid/ask spread. Slippage risk is high.');
  }

  if (status === 'READY') {
    reasons.push('Market conditions are favorable for execution.');
  }

  return { status, reasons };
}
