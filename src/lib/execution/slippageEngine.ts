import { SlippageAnalysis } from './types';
import { LegMarketContext, calculateLimitPrice } from './limitPriceEngine';

export function calculateSlippage(legContexts: LegMarketContext[], volumeData: (number | null)[]): SlippageAnalysis {
  let hasMissingData = false;

  for (const ctx of legContexts) {
    if (ctx.bid === null || ctx.ask === null) {
      hasMissingData = true;
      break;
    }
  }

  for (const v of volumeData) {
    if (v === null) {
      hasMissingData = true;
      break;
    }
  }

  if (hasMissingData || legContexts.length === 0) {
    return {
      estimatedSlippage: null,
      liquidityPenalty: null,
      totalExecutionCost: null,
      breakEvenImpact: null
    };
  }

  const limitCtx = calculateLimitPrice(legContexts);
  if (limitCtx.bid === null || limitCtx.ask === null || limitCtx.midpoint === null) {
    return {
      estimatedSlippage: null,
      liquidityPenalty: null,
      totalExecutionCost: null,
      breakEvenImpact: null
    };
  }

  // Bid/ask spread is the difference between what we pay (ask) and what we'd sell for (bid)
  // in our normalized totalAsk and totalBid variables.
  // totalAsk (aggressive entry) is worst price. totalBid (conservative) is best.
  const spreadCost = Math.abs(limitCtx.ask - limitCtx.bid);

  // Standard estimated slippage is often a fraction of the spread, say 25% if we cross the spread
  const estimatedSlippage = spreadCost * 0.25;

  // Liquidity penalty: if volume is very low across legs, we might pay more of the spread
  let minVolume = Math.min(...(volumeData as number[]));
  let liquidityPenalty = 0;
  if (minVolume < 50) {
    liquidityPenalty = spreadCost * 0.5; // low liquidity means we might cross the full spread
  } else if (minVolume < 500) {
    liquidityPenalty = spreadCost * 0.25;
  }

  const totalExecutionCost = estimatedSlippage + liquidityPenalty;

  return {
    estimatedSlippage: Number(estimatedSlippage.toFixed(2)),
    liquidityPenalty: Number(liquidityPenalty.toFixed(2)),
    totalExecutionCost: Number(totalExecutionCost.toFixed(2)),
    breakEvenImpact: Number(totalExecutionCost.toFixed(2)) // for a 1 quantity position, the break even impact is just the cost
  };
}
