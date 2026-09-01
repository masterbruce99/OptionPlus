import { ProbabilityAnalysis } from './types';

// Normal CDF approximation
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export interface ProbParams {
  S: number; // Current underlying price
  K: number; // Strike price
  T: number; // Time to expiration in years
  r: number; // Risk-free rate
  v: number; // Implied Volatility
}

/**
 * Calculates probability estimates using a standard lognormal model (Black-Scholes risk-neutral measure).
 * N(d2) represents the risk-neutral probability that the option will expire in-the-money.
 * 
 * @param params S, K, T, r, v
 */
export function calculateProbabilities(params: ProbParams): ProbabilityAnalysis {
  const { S, K, T, r, v } = params;

  if (T <= 0 || v <= 0 || S <= 0 || K <= 0) {
    return {
      status: 'INSUFFICIENT DATA',
      probabilityAbove: null,
      probabilityBelow: null,
      probabilityITM: null,
      probabilityOTM: null,
      probabilityOfProfit: null,
      methodology: 'Missing valid inputs for probability model.',
      assumptions: []
    };
  }

  // Calculate d2 (probability under risk-neutral measure)
  // d1 = (ln(S/K) + (r + v^2/2)T) / (v * sqrt(T))
  // d2 = d1 - v * sqrt(T) = (ln(S/K) + (r - v^2/2)T) / (v * sqrt(T))
  const d2 = (Math.log(S / K) + (r - (v * v) / 2) * T) / (v * Math.sqrt(T));

  // Probability of finishing > K
  const probAbove = normalCDF(d2);
  // Probability of finishing < K
  const probBelow = 1 - probAbove;

  return {
    status: 'MODEL ESTIMATE',
    probabilityAbove: probAbove,
    probabilityBelow: probBelow,
    probabilityITM: null, // Will be set by caller depending on Call or Put
    probabilityOTM: null,
    probabilityOfProfit: null, // Specific to strategy
    methodology: 'Lognormal distribution model (Risk-Neutral probability via Black-Scholes).',
    assumptions: [
      'MODEL ASSUMPTION: Probability estimate uses a simplified continuous model (European-style) and may differ from real exercise/assignment behavior for American-style options.',
      'MODEL ASSUMPTION: Assumes constant volatility and constant interest rates over the time period.',
      'MODEL ASSUMPTION: Returns are assumed to be lognormally distributed, which may underestimate the probability of extreme tail events.'
    ]
  };
}

/**
 * Convenience wrapper to determine ITM/OTM probability for a single option.
 */
export function calculateOptionProbabilities(params: ProbParams, type: 'call' | 'put'): ProbabilityAnalysis {
  const base = calculateProbabilities(params);
  if (base.status !== 'MODEL ESTIMATE') return base;

  if (type === 'call') {
    base.probabilityITM = base.probabilityAbove;
    base.probabilityOTM = base.probabilityBelow;
  } else {
    base.probabilityITM = base.probabilityBelow;
    base.probabilityOTM = base.probabilityAbove;
  }

  return base;
}
