import { LivePosition, PositionPnL, AdjustmentRecommendation, PositionStatus, LegFill } from './types';
import { OptionContract, Quote } from '../providers/MarketDataProvider';
import { updateJournalEntry, getJournal, TradePostMortem } from '../store';

/**
 * Calculates current real-time PnL based on live market quotes.
 * Matches current market mid-price for each leg against the fill price.
 */
export function calculateRealTimePnL(
  position: LivePosition,
  currentQuote: Quote,
  currentOptionChain: OptionContract[] // All options for the underlying
): PositionPnL {
  let unrealizedPnL = 0;
  let capitalTiedUp = 0;

  // We need at least some data to proceed
  if (!position.fills || position.fills.length === 0 || position.status === 'CLOSED') {
    return position.currentPnL;
  }

  for (const fill of position.fills) {
    const leg = position.plan.legs.find(l => l.id === fill.legId);
    if (!leg) continue;

    const qty = fill.quantity * leg.multiplier;
    const entryCost = fill.fillPrice * qty;

    if (leg.type === 'stock') {
      const currentPrice = currentQuote.price || fill.fillPrice;
      const currentValue = currentPrice * qty;
      
      if (leg.side === 'long') {
        unrealizedPnL += (currentValue - entryCost);
        capitalTiedUp += entryCost;
      } else {
        unrealizedPnL += (entryCost - currentValue);
        capitalTiedUp += entryCost; // simplify short margin
      }
    } else {
      // Find option in chain
      const optionQuote = currentOptionChain.find(o => 
        o.type === leg.type && 
        o.strike === leg.strike && 
        o.expiration === position.plan.expiration
      );

      // If we can't find it, use 0 change
      let currentPrice = fill.fillPrice;
      if (optionQuote && optionQuote.bid !== null && optionQuote.ask !== null) {
        currentPrice = (optionQuote.bid + optionQuote.ask) / 2;
      } else if (optionQuote && optionQuote.last !== null) {
        currentPrice = optionQuote.last;
      }

      const currentValue = currentPrice * qty;

      if (leg.side === 'long') {
        unrealizedPnL += (currentValue - entryCost);
        capitalTiedUp += entryCost;
      } else {
        unrealizedPnL += (entryCost - currentValue);
        // Short option margin is complex, simplified here to strike
        capitalTiedUp += (leg.strike * qty);
      }
    }
  }

  const returnOnCapital = capitalTiedUp > 0 ? (unrealizedPnL / capitalTiedUp) * 100 : 0;

  return {
    unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
    realizedPnL: position.currentPnL.realizedPnL,
    returnOnCapital: Number(returnOnCapital.toFixed(2)),
    marginUtilization: Number(capitalTiedUp.toFixed(2))
  };
}

export function evaluateLifecycleState(position: LivePosition): PositionStatus {
  if (position.status === 'CLOSED') return 'CLOSED';
  if (position.status === 'PLANNED') {
    if (position.fills && position.fills.length > 0) return 'ENTERED';
    return 'PLANNED';
  }
  
  if (position.status === 'ENTERED' || position.status === 'OPEN') {
    // If target reached or stop hit, EXIT_READY
    const unrealized = position.currentPnL.unrealizedPnL || 0;
    
    // Check stop loss
    if (position.plan.maxPlannedLoss !== null && unrealized <= -Math.abs(position.plan.maxPlannedLoss)) {
      return 'EXIT_READY';
    }

    if (position.adjustmentRecommendation && position.adjustmentRecommendation.type !== 'NONE') {
      return 'ADJUSTMENT_NEEDED';
    }

    return 'OPEN';
  }

  return position.status;
}

export function evaluateAdjustments(position: LivePosition, currentQuote: Quote): AdjustmentRecommendation | null {
  if (position.status === 'CLOSED') return null;

  // Simple heuristic based adjustments
  const unrealized = position.currentPnL.unrealizedPnL || 0;
  const maxLoss = position.plan.maxPlannedLoss;

  if (maxLoss !== null && unrealized <= -Math.abs(maxLoss)) {
    return {
      type: 'CLOSE_EARLY',
      reason: 'Max planned loss breached.',
      suggestedAction: 'Close position to prevent further losses according to original plan.',
      urgency: 'HIGH'
    };
  }

  if (position.currentPnL.returnOnCapital && position.currentPnL.returnOnCapital > 50) {
    return {
      type: 'SCALE_OUT',
      reason: 'Position has achieved >50% Return on Capital.',
      suggestedAction: 'Consider taking partial profits.',
      urgency: 'LOW'
    };
  }

  // E.g. short strike tested
  const shortLegs = position.plan.legs.filter(l => l.side === 'short' && l.type !== 'stock');
  if (shortLegs.length > 0 && currentQuote.price !== null) {
    for (const leg of shortLegs) {
      const distance = Math.abs(currentQuote.price - leg.strike) / currentQuote.price;
      if (distance < 0.02) {
        return {
          type: 'ROLL_FORWARD',
          reason: `Short ${leg.type} strike at ${leg.strike} is being tested (within 2%).`,
          suggestedAction: 'Evaluate rolling down/up and out in time to collect more premium.',
          urgency: 'MEDIUM'
        };
      }
    }
  }

  return { type: 'NONE', reason: '', suggestedAction: '', urgency: 'LOW' };
}

export function closePosition(
  position: LivePosition, 
  exitFills: LegFill[], 
  currentQuote: Quote,
  tradeReview: string,
  mistakeClassification: TradePostMortem['mistakeClassification']
): LivePosition {
  
  // Calculate Realized PnL
  let realizedPnL = 0;
  
  for (const exit of exitFills) {
    const leg = position.plan.legs.find(l => l.id === exit.legId);
    const entryFill = position.fills.find(f => f.legId === exit.legId);
    if (!leg || !entryFill) continue;

    const qty = exit.quantity * leg.multiplier;
    const entryValue = entryFill.fillPrice * qty;
    const exitValue = exit.fillPrice * qty;

    if (leg.side === 'long') {
      realizedPnL += (exitValue - entryValue);
    } else {
      realizedPnL += (entryValue - exitValue);
    }
  }

  const daysHeld = position.enteredAt 
    ? Math.max(0, Math.ceil((Date.now() - position.enteredAt) / (1000 * 3600 * 24)))
    : 0;

  const closedPosition: LivePosition = {
    ...position,
    status: 'CLOSED',
    closedAt: Date.now(),
    currentPnL: {
      ...position.currentPnL,
      unrealizedPnL: 0,
      realizedPnL: Number(realizedPnL.toFixed(2))
    }
  };

  // Sync to Journal if there is a journal entry linked to this plan ID
  // In our system, the journal entry might have the same ID as the plan or have the plan inside it.
  // We'll search for the journal entry by strategy/date or we assume the journal entry ID matches the plan ID
  const journals = getJournal();
  const linkedEntry = journals.find(j => j.id === position.plan.id);

  if (linkedEntry) {
    const postMortem: TradePostMortem = {
      exitDate: new Date().toISOString(),
      exitPrice: exitFills[0]?.fillPrice || 0, // Simplify
      underlyingPriceAtExit: currentQuote.price || 0,
      realizedPL: Number(realizedPnL.toFixed(2)),
      daysHeld,
      expectedVsActualMove: { expected: 0, actual: 0 },
      thesisAccuracy: realizedPnL > 0 ? 'CORRECT' : 'WRONG',
      primaryPLDriver: 'UNKNOWN',
      mistakeClassification,
      tradeReview
    };

    updateJournalEntry(linkedEntry.id, {
      status: 'closed',
      postMortem
    });
  }

  return closedPosition;
}
