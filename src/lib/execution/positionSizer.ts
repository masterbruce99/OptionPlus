import { PositionSizeResult } from './types';
import { StrategyAnalysis } from '../payoffEngine';

export interface SizingConstraints {
  maxDollarRisk: number | null; // maximum loss we are willing to take
  maxCapitalAllocation: number | null; // maximum capital we want to tie up
  portfolioRiskLimit: number | null; // limit from portfolio level
}

export function calculatePositionSize(
  analysis: StrategyAnalysis,
  constraints: SizingConstraints
): PositionSizeResult {
  const { maxLoss, capitalRequired } = analysis;

  let maxQtyByRisk = Infinity;
  let maxQtyByCapital = Infinity;
  let maxQtyByPortfolio = Infinity;

  // Max Loss per 1 unit of the strategy
  const unitMaxLoss = maxLoss !== null ? maxLoss : Infinity;
  
  if (constraints.maxDollarRisk !== null && constraints.maxDollarRisk > 0) {
    if (unitMaxLoss === 0) {
      maxQtyByRisk = Infinity; // Riskless trade (rare/arbitrage)
    } else if (unitMaxLoss === Infinity) {
      maxQtyByRisk = 0; // Infinite risk, cannot size by fixed dollar risk
    } else {
      maxQtyByRisk = Math.floor(constraints.maxDollarRisk / unitMaxLoss);
    }
  }

  if (constraints.maxCapitalAllocation !== null && constraints.maxCapitalAllocation > 0) {
    if (capitalRequired === 0) {
      maxQtyByCapital = Infinity;
    } else {
      maxQtyByCapital = Math.floor(constraints.maxCapitalAllocation / capitalRequired);
    }
  }

  if (constraints.portfolioRiskLimit !== null && constraints.portfolioRiskLimit > 0) {
    if (unitMaxLoss === 0) {
      maxQtyByPortfolio = Infinity;
    } else if (unitMaxLoss === Infinity) {
      maxQtyByPortfolio = 0;
    } else {
      maxQtyByPortfolio = Math.floor(constraints.portfolioRiskLimit / unitMaxLoss);
    }
  }

  let maxQuantity = Math.min(maxQtyByRisk, maxQtyByCapital, maxQtyByPortfolio);
  if (maxQuantity === Infinity || maxQuantity < 0) {
    maxQuantity = 0;
  }

  const suggestedQuantity = maxQuantity > 0 ? maxQuantity : 1;
  const finalCapitalRequired = suggestedQuantity * capitalRequired;
  const finalMaxLoss = unitMaxLoss === Infinity ? null : suggestedQuantity * unitMaxLoss;

  let portfolioImpact = 'NEGLIGIBLE';
  if (finalMaxLoss !== null && constraints.maxDollarRisk !== null && constraints.maxDollarRisk > 0) {
    const ratio = finalMaxLoss / constraints.maxDollarRisk;
    if (ratio >= 0.8) portfolioImpact = 'HIGH';
    else if (ratio >= 0.4) portfolioImpact = 'MODERATE';
    else portfolioImpact = 'LOW';
  } else if (unitMaxLoss === Infinity) {
    portfolioImpact = 'UNLIMITED_RISK';
  }

  return {
    suggestedQuantity,
    maxQuantity,
    capitalRequired: finalCapitalRequired,
    maxLoss: finalMaxLoss,
    portfolioImpact
  };
}
