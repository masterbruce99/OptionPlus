import { TradeLedgerEntry, PerformanceMetrics, DrawdownInfo } from './types';

/**
 * Calculates performance metrics from a trade ledger.
 * Module 14: Performance Metrics
 * Module 15: Drawdown
 * Module 16: Equity Curve
 * Module 18: Sample Size
 */
export function calculatePerformanceMetrics(
  ledger: TradeLedgerEntry[],
  startingCapital: number
): PerformanceMetrics {
  const tradeCount = ledger.length;

  if (tradeCount === 0) {
    return {
      totalNetPnL: 0,
      returnPercentage: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      profitFactor: 0,
      maxDrawdown: null,
      tradeCount: 0,
      averageHoldingPeriodDays: 0,
      sampleSizeWarning: true,
      equityCurve: [{ date: 'Initial', cumulativePnL: 0, capital: startingCapital }]
    };
  }

  let totalNetPnL = 0;
  let winningTrades = 0;
  let totalWinAmount = 0;
  let losingTrades = 0;
  let totalLossAmount = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let totalHoldingDays = 0;

  const equityCurve: { date: string; cumulativePnL: number; capital: number }[] = [];
  equityCurve.push({ date: 'Initial', cumulativePnL: 0, capital: startingCapital });

  // Drawdown tracking variables
  let peakCapital = startingCapital;
  let peakDate = 'Initial';
  let maxDrawdownPercentage = 0;
  let maxDrawdownTrough = startingCapital;
  let maxDrawdownTroughDate = 'Initial';
  let maxDrawdownPeak = startingCapital;
  let maxDrawdownPeakDate = 'Initial';

  // Sort ledger by exit date to build equity curve chronologically
  const sortedLedger = [...ledger].sort((a, b) => {
    const dateA = a.exitDate || a.entryDate;
    const dateB = b.exitDate || b.entryDate;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  for (const trade of sortedLedger) {
    const pnl = trade.netPnL || 0;
    totalNetPnL += pnl;
    
    if (pnl > 0) {
      winningTrades++;
      totalWinAmount += pnl;
      if (pnl > largestWin) largestWin = pnl;
    } else if (pnl < 0) {
      losingTrades++;
      totalLossAmount += Math.abs(pnl);
      if (pnl < largestLoss) largestLoss = pnl;
    }

    if (trade.holdingPeriodDays) {
      totalHoldingDays += trade.holdingPeriodDays;
    }

    const currentCapital = startingCapital + totalNetPnL;
    const date = trade.exitDate || trade.entryDate;
    equityCurve.push({ date, cumulativePnL: totalNetPnL, capital: currentCapital });

    // Drawdown Calculation
    if (currentCapital > peakCapital) {
      peakCapital = currentCapital;
      peakDate = date;
    } else {
      const drawdown = (peakCapital - currentCapital) / peakCapital;
      if (drawdown > maxDrawdownPercentage) {
        maxDrawdownPercentage = drawdown;
        maxDrawdownPeak = peakCapital;
        maxDrawdownPeakDate = peakDate;
        maxDrawdownTrough = currentCapital;
        maxDrawdownTroughDate = date;
      }
    }
  }

  const averageWin = winningTrades > 0 ? totalWinAmount / winningTrades : 0;
  const averageLoss = losingTrades > 0 ? totalLossAmount / losingTrades : 0;
  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : (totalWinAmount > 0 ? Number.POSITIVE_INFINITY : 0);
  const winRate = winningTrades / tradeCount;
  const returnPercentage = (totalNetPnL / startingCapital) * 100;
  const averageHoldingPeriodDays = totalHoldingDays / tradeCount;

  // Module 18: Sample Size
  const sampleSizeWarning = tradeCount < 30; // Standard statistical rule of thumb

  let maxDrawdown: DrawdownInfo | null = null;
  if (maxDrawdownPercentage > 0) {
    maxDrawdown = {
      peakDate: maxDrawdownPeakDate,
      peakValue: maxDrawdownPeak,
      troughDate: maxDrawdownTroughDate,
      troughValue: maxDrawdownTrough,
      drawdownPercentage: maxDrawdownPercentage * 100 // as a percentage 0-100
    };
  }

  return {
    totalNetPnL,
    returnPercentage,
    winRate,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    profitFactor,
    maxDrawdown,
    tradeCount,
    averageHoldingPeriodDays,
    sampleSizeWarning,
    equityCurve
  };
}
