import { calculateProbabilities, ProbParams } from './probabilityEngine';
import { ProbabilityAnalysis } from './types';

export type StrategyType = 
  | 'Long Call' 
  | 'Long Put' 
  | 'Short Call' 
  | 'Short Put'
  | 'Covered Call' 
  | 'Cash-Secured Put' 
  | 'Bull Call Spread' 
  | 'Bear Put Spread' 
  | 'Bull Put Spread' 
  | 'Bear Call Spread';

export interface POPParams extends Omit<ProbParams, 'K'> {
  strategy: StrategyType;
  breakEven: number;
}

/**
 * Calculates the Probability of Profit (POP) based on the strategy's break-even point.
 * This is fundamentally different from Probability of ITM.
 */
export function calculateProbabilityOfProfit(params: POPParams): ProbabilityAnalysis {
  const { S, breakEven, T, r, v, strategy } = params;

  // We use the break-even as the "Strike" for the lognormal distribution
  const probParams: ProbParams = { S, K: breakEven, T, r, v };
  const base = calculateProbabilities(probParams);

  if (base.status !== 'MODEL ESTIMATE') return base;

  // Determine if profit requires being ABOVE or BELOW the break-even
  let pop: number | null = null;
  
  switch (strategy) {
    case 'Long Call':
    case 'Covered Call':
    case 'Cash-Secured Put':
    case 'Bull Call Spread':
    case 'Bull Put Spread':
    case 'Short Put':
      pop = base.probabilityAbove;
      break;
    
    case 'Long Put':
    case 'Bear Put Spread':
    case 'Bear Call Spread':
    case 'Short Call':
      pop = base.probabilityBelow;
      break;
  }

  base.probabilityOfProfit = pop;
  base.methodology = 'Lognormal distribution model evaluated at the strategy Break-Even price.';
  
  return base;
}
