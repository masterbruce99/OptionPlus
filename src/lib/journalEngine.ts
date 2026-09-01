import { AdvancedJournalEntry, TradePostMortem } from './store';

export function calculateThesisAccuracy(entry: AdvancedJournalEntry): TradePostMortem['thesisAccuracy'] {
  if (!entry.postMortem) return 'WRONG';
  
  const expectedDir = entry.direction;
  const actualMove = entry.postMortem.expectedVsActualMove.actual; // positive means up, negative means down
  
  if (expectedDir === 'bullish' && actualMove > 0) return 'CORRECT';
  if (expectedDir === 'bearish' && actualMove < 0) return 'CORRECT';
  if (expectedDir === 'neutral' && Math.abs(actualMove) < (entry.postMortem.expectedVsActualMove.expected || 1)) return 'CORRECT';
  
  if (entry.postMortem.realizedPL > 0) return 'PARTIALLY_CORRECT'; // Right outcome, wrong reason
  
  return 'WRONG';
}

export function analyzePLDrivers(entry: AdvancedJournalEntry): TradePostMortem['primaryPLDriver'] {
  if (!entry.postMortem || entry.status !== 'closed') return 'UNKNOWN';

  // Deterministic approximation without historical greeks:
  // If the thesis was CORRECT (directional move happened), it's DELTA driven.
  // If the trade was held close to expiration and direction was wrong/flat, it's THETA driven.
  // If the actual move was very small but P/L is large, it's VEGA driven.
  
  const accuracy = calculateThesisAccuracy(entry);
  const timeHorizon = entry.postMortem.daysHeld;
  
  if (accuracy === 'CORRECT' && entry.postMortem.realizedPL > 0) {
    return 'DELTA';
  }
  
  if (timeHorizon > 14 && Math.abs(entry.postMortem.expectedVsActualMove.actual) < entry.postMortem.expectedVsActualMove.expected) {
    // Stock didn't move much, held for a while. Usually Theta wins (if short) or loses (if long).
    return 'THETA';
  }

  return 'MULTI';
}

export function generateDeterministicExplanation(entry: AdvancedJournalEntry): string {
  if (!entry.postMortem || entry.status !== 'closed') return "Trade is not closed.";

  const pl = entry.postMortem.realizedPL;
  const outcomeStr = pl > 0 ? `You made a profit of $${pl.toFixed(2)}.` : `You realized a loss of $${Math.abs(pl).toFixed(2)}.`;
  
  const accuracy = calculateThesisAccuracy(entry);
  let thesisStr = "";
  if (accuracy === 'CORRECT') {
    thesisStr = `Your directional thesis (${entry.direction}) was correct, as the stock moved $${entry.postMortem.expectedVsActualMove.actual.toFixed(2)}.`;
  } else if (accuracy === 'PARTIALLY_CORRECT') {
    thesisStr = `Your directional thesis was technically incorrect, but the trade still profited, suggesting favorable volatility or time decay.`;
  } else {
    thesisStr = `Your directional thesis (${entry.direction}) was incorrect.`;
  }
  
  const driver = analyzePLDrivers(entry);
  let driverStr = "";
  if (driver === 'DELTA') {
    driverStr = "This trade's outcome was primarily driven by Delta (directional movement).";
  } else if (driver === 'THETA') {
    driverStr = "Time decay (Theta) appears to be a significant factor due to the holding period and lack of directional movement.";
  } else if (driver === 'VEGA') {
    driverStr = "Changes in implied volatility (Vega) likely played a major role in this outcome.";
  } else {
    driverStr = "The outcome was driven by a complex interaction of multiple Greeks.";
  }

  let mistakeStr = "";
  if (entry.postMortem.mistakeClassification && entry.postMortem.mistakeClassification !== 'NONE') {
    mistakeStr = `\n\nSelf-Identified Mistake: You classified this trade as a ${entry.postMortem.mistakeClassification} error.`;
  }

  return `${outcomeStr} ${thesisStr} ${driverStr}${mistakeStr}`;
}

export function calculateWinRate(entries: AdvancedJournalEntry[]): number {
  const closed = entries.filter(e => e.status === 'closed' && e.postMortem);
  if (closed.length === 0) return 0;
  
  const wins = closed.filter(e => (e.postMortem?.realizedPL ?? 0) > 0).length;
  return (wins / closed.length) * 100;
}

export function calculateWinRateByStrategy(entries: AdvancedJournalEntry[]): Record<string, { winRate: number, count: number }> {
  const closed = entries.filter(e => e.status === 'closed' && e.postMortem);
  const strategies = [...new Set(closed.map(e => e.strategy))];
  
  const results: Record<string, { winRate: number, count: number }> = {};
  
  strategies.forEach(strategy => {
    const strategyTrades = closed.filter(e => e.strategy === strategy);
    const wins = strategyTrades.filter(e => (e.postMortem?.realizedPL ?? 0) > 0).length;
    results[strategy] = {
      winRate: (wins / strategyTrades.length) * 100,
      count: strategyTrades.length
    };
  });
  
  return results;
}

export function calculateEV(entries: AdvancedJournalEntry[]): number {
  const closed = entries.filter(e => e.status === 'closed' && e.postMortem);
  if (closed.length === 0) return 0;
  
  const totalPL = closed.reduce((sum, e) => sum + (e.postMortem?.realizedPL ?? 0), 0);
  return totalPL / closed.length;
}
