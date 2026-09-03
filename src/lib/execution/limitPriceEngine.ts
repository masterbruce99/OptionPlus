import { TradeLeg } from '../payoffEngine';
import { LimitPriceContext } from './types';

export interface LegMarketContext {
  leg: TradeLeg;
  bid: number | null;
  ask: number | null;
}

export function calculateLimitPrice(legContexts: LegMarketContext[]): LimitPriceContext {
  let hasMissingData = false;
  let totalBid = 0;
  let totalAsk = 0;

  for (const ctx of legContexts) {
    if (ctx.bid === null || ctx.ask === null) {
      hasMissingData = true;
      break;
    }

    const { leg, bid, ask } = ctx;
    const qty = leg.quantity * leg.multiplier;

    // For total package bid: 
    // If we want to sell the package, we sell the long legs at their bid, 
    // and buy the short legs at their ask.
    // However, conventionally for a multi-leg strategy:
    // Package Bid = sum of (sell leg at bid, buy short leg at ask) -> what market maker pays us
    // Package Ask = sum of (buy leg at ask, sell short leg at bid) -> what we pay market maker

    // It's simpler to calculate the net cost to ENTER the position from the perspective of the user:
    // User Cost at Market (Aggressive): Buy long legs at Ask, Sell short legs at Bid.
    // User Cost at theoretical/ideal (Conservative): Buy long legs at Bid, Sell short legs at Ask.

    const aggressiveEntryCost = leg.side === 'long' ? ask * qty : -bid * qty;
    const conservativeEntryCost = leg.side === 'long' ? bid * qty : -ask * qty;

    totalAsk += aggressiveEntryCost; // what we pay (or receive if negative) for aggressive entry
    totalBid += conservativeEntryCost; // what we pay (or receive if negative) for conservative entry
  }

  if (hasMissingData || legContexts.length === 0) {
    return {
      bid: null,
      ask: null,
      midpoint: null,
      theoretical: null,
      suggestedLimit: null,
      acceptableRange: null,
      debitOrCredit: 'UNKNOWN'
    };
  }

  // totalAsk is the worst price for the user (highest debit or lowest credit)
  // totalBid is the best price for the user (lowest debit or highest credit)

  let debitOrCredit: 'DEBIT' | 'CREDIT' | 'ZERO' = 'ZERO';
  // Note: Cost is positive for debit, negative for credit.
  if (totalAsk > 0 && totalBid >= 0) {
    debitOrCredit = 'DEBIT';
  } else if (totalAsk < 0 && totalBid <= 0) {
    debitOrCredit = 'CREDIT';
  } else if (totalAsk > 0 && totalBid < 0) {
    // Crosses zero (very rare, usually means huge spread where conservative is a credit but aggressive is a debit)
    debitOrCredit = 'DEBIT';
  }

  const midpoint = (totalBid + totalAsk) / 2;
  const suggestedLimit = midpoint; // Midpoint is typically the suggested limit
  const conservative = totalBid;
  const aggressive = totalAsk;

  return {
    bid: Number(conservative.toFixed(2)),
    ask: Number(aggressive.toFixed(2)),
    midpoint: Number(midpoint.toFixed(2)),
    theoretical: null, // Placeholder for theoretical pricing model
    suggestedLimit: Number(midpoint.toFixed(2)), // Default suggestion
    acceptableRange: debitOrCredit === 'DEBIT' ? [Number(conservative.toFixed(2)), Number(aggressive.toFixed(2))] : [Number(aggressive.toFixed(2)), Number(conservative.toFixed(2))],
    debitOrCredit
  };
}
