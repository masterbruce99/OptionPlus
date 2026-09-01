/**
 * Opportunity Scoring Engines — Phase 5 Modules 2–7, 10
 *
 * Every scoring function returns:
 * - The raw measurements used in the calculation
 * - A breakdown showing each component's contribution
 * - A dataSource label indicating the origin of the data
 *
 * REAL-DATA RULE: These engines only process data passed to them.
 * They never fabricate inputs. If data is missing, scores reflect that.
 */

import { OptionContract } from './providers/MarketDataProvider';
import { TradeLeg, StrategyAnalysis } from './payoffEngine';

// ============================================================
// Module 3 & 4: Edge Quality + Capital Efficiency
// ============================================================

/**
 * User-configurable cost assumptions.
 * These are defaults — users should adjust based on their broker.
 */
export interface CostAssumptions {
  /** Commission per contract (open or close), e.g. $0.65 */
  commissionPerContract: number;
  /** Exchange fee per contract, e.g. $0.30 */
  exchangeFeePerContract: number;
  /** Regulatory fee per contract (SEC, FINRA, OCC), e.g. $0.03 */
  regulatoryFeePerContract: number;
  /** Estimated slippage as fraction of capital, e.g. 0.005 = 0.5% */
  slippageEstimatePercent: number;
}

export const DEFAULT_COST_ASSUMPTIONS: CostAssumptions = {
  commissionPerContract: 0.65,
  exchangeFeePerContract: 0.30,
  regulatoryFeePerContract: 0.03,
  slippageEstimatePercent: 0.005
};

export interface EdgeAnalysis {
  grossEdge: number;
  estimatedCosts: number;
  netEdge: number;
  /** netEdge / capitalRequired (0 if capitalRequired is 0) */
  netEdgePercent: number;
  capitalRequired: number;
  /** netEdge / capitalRequired */
  returnOnCapital: number;
  /** Annualized return or null if annualization would be misleading */
  annualizedReturn: number | null;
  annualizationDisclaimer: string | null;
  dataSource: 'CALCULATED';
}

/**
 * Calculates edge quality for an opportunity.
 *
 * Methodology:
 * - grossEdge: For credit strategies (netDebitCredit > 0), uses the net credit received.
 *   For debit strategies with a finite maxProfit, uses maxProfit. Otherwise 0.
 * - estimatedCosts: Sum of per-contract fees × totalContracts × 2 (open+close),
 *   plus slippage estimate (slippagePercent × capitalRequired).
 * - netEdge: grossEdge - estimatedCosts
 * - annualizedReturn: Only when 7 ≤ DTE ≤ 365 and netEdge > 0.
 *   Formula: (1 + returnOnCapital)^(365/DTE) - 1
 *
 * Limitations:
 * - Cost assumptions are user-configured estimates, not broker-verified.
 * - Slippage is a rough percentage, not based on order book depth.
 * - Annualization assumes the same opportunity can be repeated, which is unlikely.
 */
export function calculateEdgeQuality(
  strategyAnalysis: StrategyAnalysis,
  costAssumptions: CostAssumptions,
  daysToExpiration: number,
  totalContracts: number
): EdgeAnalysis {
  // Determine gross edge
  let grossEdge: number;
  if (strategyAnalysis.netDebitCredit > 0) {
    // Credit strategy — the credit IS the maximum gross profit
    grossEdge = strategyAnalysis.netDebitCredit;
  } else if (strategyAnalysis.maxProfit !== null && strategyAnalysis.maxProfit > 0) {
    grossEdge = strategyAnalysis.maxProfit;
  } else {
    grossEdge = 0;
  }

  // Estimate costs: per-contract fees × contracts × 2 (open + close)
  const perContractFee =
    costAssumptions.commissionPerContract +
    costAssumptions.exchangeFeePerContract +
    costAssumptions.regulatoryFeePerContract;
  const totalFees = perContractFee * totalContracts * 2;
  const slippage = costAssumptions.slippageEstimatePercent * strategyAnalysis.capitalRequired;
  const estimatedCosts = totalFees + slippage;

  const netEdge = grossEdge - estimatedCosts;
  const capitalRequired = strategyAnalysis.capitalRequired;
  const netEdgePercent = capitalRequired > 0 ? netEdge / capitalRequired : 0;
  const returnOnCapital = capitalRequired > 0 ? netEdge / capitalRequired : 0;

  // Annualization: only when DTE is reasonable and edge is positive
  let annualizedReturn: number | null = null;
  let annualizationDisclaimer: string | null = null;

  if (daysToExpiration >= 7 && daysToExpiration <= 365 && netEdge > 0 && capitalRequired > 0) {
    annualizedReturn = Math.pow(1 + returnOnCapital, 365 / daysToExpiration) - 1;
    annualizationDisclaimer =
      'Assumes identical opportunity available at expiration, which is unlikely. ' +
      'Annualized return is a mathematical projection, not a guaranteed outcome.';
  } else if (daysToExpiration < 7) {
    annualizationDisclaimer =
      'Not annualized: DTE < 7 days. Annualizing very short-term trades produces ' +
      'misleadingly large numbers.';
  } else if (daysToExpiration > 365) {
    annualizationDisclaimer =
      'Not annualized: DTE > 365 days. The actual return already spans more than one year.';
  } else if (netEdge <= 0) {
    annualizationDisclaimer =
      'Not annualized: net edge is zero or negative after estimated costs.';
  }

  return {
    grossEdge,
    estimatedCosts,
    netEdge,
    netEdgePercent,
    capitalRequired,
    returnOnCapital,
    annualizedReturn,
    annualizationDisclaimer,
    dataSource: 'CALCULATED'
  };
}

// ============================================================
// Module 5: Liquidity Score
// ============================================================

export interface LiquidityBreakdownItem {
  metric: string;
  value: number;
  weight: number;
  /** Normalized to 0–100 */
  normalizedScore: number;
  /** normalizedScore × weight */
  contribution: number;
}

export interface LiquidityAnalysis {
  /** Composite score 0–100 */
  score: number;
  classification: 'HIGH' | 'MEDIUM' | 'LOW';
  spreadPercent: number;
  avgVolume: number;
  avgOpenInterest: number;
  quoteFreshness: string;
  breakdown: LiquidityBreakdownItem[];
  dataSource: 'REAL MARKET DATA';
}

/**
 * Normalizes bid/ask spread percentage to a 0–100 score.
 * Lower spread = better = higher score.
 */
function normalizeSpreadScore(spreadPct: number): number {
  if (spreadPct < 0.005) return 100;  // < 0.5%
  if (spreadPct < 0.01) return 80;    // < 1%
  if (spreadPct < 0.02) return 60;    // < 2%
  if (spreadPct < 0.05) return 40;    // < 5%
  if (spreadPct < 0.10) return 20;    // < 10%
  return 0;
}

function normalizeVolumeScore(volume: number): number {
  if (volume > 5000) return 100;
  if (volume > 1000) return 80;
  if (volume > 500) return 60;
  if (volume > 100) return 40;
  if (volume > 10) return 20;
  return 0;
}

function normalizeOIScore(oi: number): number {
  if (oi > 10000) return 100;
  if (oi > 5000) return 80;
  if (oi > 1000) return 60;
  if (oi > 500) return 40;
  if (oi > 100) return 20;
  return 0;
}

/**
 * Calculates a transparent liquidity score from real market data.
 *
 * Methodology:
 * - Spread Score (weight 0.40): Based on average bid/ask spread percentage across contracts.
 *   < 0.5% = 100, < 1% = 80, < 2% = 60, < 5% = 40, < 10% = 20, else 0.
 * - Volume Score (weight 0.30): Based on average daily volume across contracts.
 *   > 5000 = 100, > 1000 = 80, > 500 = 60, > 100 = 40, > 10 = 20, else 0.
 * - Open Interest Score (weight 0.30): Based on average open interest.
 *   > 10000 = 100, > 5000 = 80, > 1000 = 60, > 500 = 40, > 100 = 20, else 0.
 *
 * Classification: score >= 80 → HIGH, >= 50 → MEDIUM, else LOW.
 *
 * Limitations:
 * - Uses snapshot data, not real-time order book depth.
 * - Volume and OI can change rapidly intraday.
 * - Does not account for hidden liquidity or dark pool activity.
 */
export function calculateLiquidityScore(contracts: OptionContract[]): LiquidityAnalysis {
  if (contracts.length === 0) {
    return {
      score: 0,
      classification: 'LOW',
      spreadPercent: 0,
      avgVolume: 0,
      avgOpenInterest: 0,
      quoteFreshness: 'No contracts available',
      breakdown: [],
      dataSource: 'REAL MARKET DATA'
    };
  }

  // Calculate averages across all contracts
  let totalSpreadPct = 0;
  let spreadCount = 0;
  let totalVolume = 0;
  let totalOI = 0;

  for (const c of contracts) {
    if (c.bid !== null && c.ask !== null) {
      const mid = (c.bid + c.ask) / 2;
      if (mid > 0) {
        totalSpreadPct += (c.ask - c.bid) / mid;
        spreadCount++;
      }
    }
    if (c.volume !== null) totalVolume += c.volume;
    if (c.openInterest !== null) totalOI += c.openInterest;
  }

  const avgSpreadPct = spreadCount > 0 ? totalSpreadPct / spreadCount : 1;
  const avgVolume = totalVolume / contracts.length;
  const avgOI = totalOI / contracts.length;

  const spreadNorm = normalizeSpreadScore(avgSpreadPct);
  const volumeNorm = normalizeVolumeScore(avgVolume);
  const oiNorm = normalizeOIScore(avgOI);

  const SPREAD_WEIGHT = 0.40;
  const VOLUME_WEIGHT = 0.30;
  const OI_WEIGHT = 0.30;

  const breakdown: LiquidityBreakdownItem[] = [
    {
      metric: 'Bid/Ask Spread %',
      value: avgSpreadPct,
      weight: SPREAD_WEIGHT,
      normalizedScore: spreadNorm,
      contribution: spreadNorm * SPREAD_WEIGHT
    },
    {
      metric: 'Average Volume',
      value: avgVolume,
      weight: VOLUME_WEIGHT,
      normalizedScore: volumeNorm,
      contribution: volumeNorm * VOLUME_WEIGHT
    },
    {
      metric: 'Average Open Interest',
      value: avgOI,
      weight: OI_WEIGHT,
      normalizedScore: oiNorm,
      contribution: oiNorm * OI_WEIGHT
    }
  ];

  const score = Math.round(breakdown.reduce((s, b) => s + b.contribution, 0));
  const classification: 'HIGH' | 'MEDIUM' | 'LOW' =
    score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';

  return {
    score,
    classification,
    spreadPercent: avgSpreadPct,
    avgVolume,
    avgOpenInterest: avgOI,
    quoteFreshness: 'Current session snapshot',
    breakdown,
    dataSource: 'REAL MARKET DATA'
  };
}

// ============================================================
// Module 6: Data Quality Score
// ============================================================

export interface DataQualityAnalysis {
  /** Composite score 0–100 */
  score: number;
  requiredFieldsPresent: number;
  totalRequiredFields: number;
  hasPricing: boolean;
  hasGreeks: boolean;
  hasVolume: boolean;
  hasOpenInterest: boolean;
  hasIV: boolean;
  missingFields: string[];
  staleData: boolean;
  consistencyIssues: string[];
  breakdown: LiquidityBreakdownItem[];
  dataSource: 'CALCULATED';
}

/**
 * Calculates data quality score for a set of option contracts.
 *
 * Methodology:
 * - Field Completeness (weight 0.50): Checks bid, ask, last, volume, openInterest,
 *   impliedVolatility, delta, gamma, theta, vega across all contracts.
 *   Score = (present / total) × 100.
 * - Pricing Consistency (weight 0.25): Validates bid ≤ ask, bid > 0, ask > 0,
 *   and last is between bid and ask (with 50% tolerance).
 *   Score = (passed checks / total checks) × 100.
 * - Data Availability (weight 0.25): IV > 0, at least one Greek present, volume > 0.
 *   Score = (available / total) × 100.
 *
 * Limitations:
 * - Cannot detect delayed data vs truly stale data without timestamps from provider.
 * - Consistency checks use loose tolerances; some legitimate market conditions
 *   (e.g., fast markets) may cause false consistency warnings.
 */
export function calculateDataQualityScore(contracts: OptionContract[]): DataQualityAnalysis {
  if (contracts.length === 0) {
    return {
      score: 0,
      requiredFieldsPresent: 0,
      totalRequiredFields: 0,
      hasPricing: false,
      hasGreeks: false,
      hasVolume: false,
      hasOpenInterest: false,
      hasIV: false,
      missingFields: ['No contracts provided'],
      staleData: true,
      consistencyIssues: ['No data available'],
      breakdown: [],
      dataSource: 'CALCULATED'
    };
  }

  const missingFields: string[] = [];
  const consistencyIssues: string[] = [];

  // --- Field Completeness ---
  // Field completeness tracked inline per contract below
  let totalRequired = 0;
  let totalPresent = 0;

  let hasPricing = false;
  let hasGreeks = false;
  let hasVolume = false;
  let hasOI = false;
  let hasIV = false;

  for (const c of contracts) {
    // Pricing fields
    if (c.bid !== null && c.bid > 0) { totalPresent++; hasPricing = true; } else { missingFields.push(`bid missing on strike ${c.strike}`); }
    totalRequired++;
    if (c.ask !== null && c.ask > 0) { totalPresent++; hasPricing = true; } else { missingFields.push(`ask missing on strike ${c.strike}`); }
    totalRequired++;
    if (c.last !== null && c.last > 0) { totalPresent++; } else { missingFields.push(`last missing on strike ${c.strike}`); }
    totalRequired++;

    // Market fields
    if (c.volume !== null && c.volume > 0) { totalPresent++; hasVolume = true; }
    totalRequired++;
    if (c.openInterest !== null && c.openInterest > 0) { totalPresent++; hasOI = true; }
    totalRequired++;
    if (c.impliedVolatility !== null && c.impliedVolatility > 0) { totalPresent++; hasIV = true; }
    totalRequired++;

    // Greeks
    if (c.greeks?.delta != null) { totalPresent++; hasGreeks = true; }
    totalRequired++;
    if (c.greeks?.gamma != null) { totalPresent++; }
    totalRequired++;
    if (c.greeks?.theta != null) { totalPresent++; }
    totalRequired++;
    if (c.greeks?.vega != null) { totalPresent++; }
    totalRequired++;
  }

  // Deduplicate missing fields for display
  const uniqueMissing = [...new Set(missingFields)].slice(0, 10);
  const fieldScore = totalRequired > 0 ? (totalPresent / totalRequired) * 100 : 0;

  // --- Pricing Consistency ---
  let consistencyChecks = 0;
  let consistencyPassed = 0;

  for (const c of contracts) {
    // bid <= ask
    consistencyChecks++;
    if (c.bid !== null && c.ask !== null && c.bid <= c.ask) {
      consistencyPassed++;
    } else {
      consistencyIssues.push(`Bid > Ask on strike ${c.strike} ${c.type}`);
    }

    // bid > 0 and ask > 0
    consistencyChecks++;
    if (c.bid !== null && c.ask !== null && c.bid > 0 && c.ask > 0) {
      consistencyPassed++;
    }

    // last between bid and ask (with 50% tolerance for last-trade drift)
    if (c.last !== null && c.last > 0 && c.bid !== null && c.bid > 0 && c.ask !== null && c.ask > 0) {
      consistencyChecks++;
      const tolerance = (c.ask - c.bid) * 0.5;
      if (c.last >= c.bid - tolerance && c.last <= c.ask + tolerance) {
        consistencyPassed++;
      } else {
        consistencyIssues.push(`Last price outside bid/ask range on strike ${c.strike}`);
      }
    }
  }

  const consistencyScore = consistencyChecks > 0 ? (consistencyPassed / consistencyChecks) * 100 : 0;

  // --- Data Availability ---
  let availabilityTotal = 0;
  let availabilityPresent = 0;

  for (const c of contracts) {
    availabilityTotal += 3;
    if (c.impliedVolatility !== null && c.impliedVolatility > 0) availabilityPresent++;
    if (c.greeks?.delta != null || c.greeks?.gamma != null || c.greeks?.theta != null || c.greeks?.vega != null) availabilityPresent++;
    if (c.volume !== null && c.volume > 0) availabilityPresent++;
  }

  const availabilityScore = availabilityTotal > 0 ? (availabilityPresent / availabilityTotal) * 100 : 0;

  const FIELD_WEIGHT = 0.50;
  const CONSISTENCY_WEIGHT = 0.25;
  const AVAILABILITY_WEIGHT = 0.25;

  const breakdown: LiquidityBreakdownItem[] = [
    {
      metric: 'Field Completeness',
      value: totalPresent,
      weight: FIELD_WEIGHT,
      normalizedScore: Math.round(fieldScore),
      contribution: fieldScore * FIELD_WEIGHT
    },
    {
      metric: 'Pricing Consistency',
      value: consistencyPassed,
      weight: CONSISTENCY_WEIGHT,
      normalizedScore: Math.round(consistencyScore),
      contribution: consistencyScore * CONSISTENCY_WEIGHT
    },
    {
      metric: 'Data Availability',
      value: availabilityPresent,
      weight: AVAILABILITY_WEIGHT,
      normalizedScore: Math.round(availabilityScore),
      contribution: availabilityScore * AVAILABILITY_WEIGHT
    }
  ];

  const score = Math.round(breakdown.reduce((s, b) => s + b.contribution, 0));

  return {
    score,
    requiredFieldsPresent: totalPresent,
    totalRequiredFields: totalRequired,
    hasPricing,
    hasGreeks,
    hasVolume,
    hasOpenInterest: hasOI,
    hasIV,
    missingFields: uniqueMissing,
    staleData: false, // Cannot determine without provider timestamps
    consistencyIssues: [...new Set(consistencyIssues)].slice(0, 10),
    breakdown,
    dataSource: 'CALCULATED'
  };
}

// ============================================================
// Module 7: Execution Score
// ============================================================

export type ExecutionClassification = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED';

export interface ExecutionAnalysis {
  classification: ExecutionClassification;
  /** Composite score 0–100 */
  score: number;
  allLegsQuoted: boolean;
  narrowSpreads: boolean;
  sufficientVolume: boolean;
  sufficientOpenInterest: boolean;
  costInfoAvailable: boolean;
  concerns: string[];
  dataSource: 'CALCULATED';
}

/**
 * Calculates execution feasibility for a set of option contracts.
 *
 * Methodology:
 * - Start at 100.
 * - Deduct 30 if not all legs have bid > 0 AND ask > 0.
 * - Deduct 20 if average spread% ≥ 5%.
 * - Deduct 20 if average volume < 100.
 * - Deduct 15 if average open interest < 500.
 * - Deduct 15 if cost info is unavailable (always available with defaults).
 *
 * Classification: ≥ 80 HIGH, ≥ 50 MEDIUM, ≥ 20 LOW, else UNVERIFIED.
 *
 * Limitations:
 * - Does not verify actual order execution capability.
 * - Does not check broker-specific routing or fill probability.
 * - This is NOT a guarantee of execution.
 */
export function calculateExecutionScore(contracts: OptionContract[]): ExecutionAnalysis {
  if (contracts.length === 0) {
    return {
      classification: 'UNVERIFIED',
      score: 0,
      allLegsQuoted: false,
      narrowSpreads: false,
      sufficientVolume: false,
      sufficientOpenInterest: false,
      costInfoAvailable: true,
      concerns: ['No contracts provided'],
      dataSource: 'CALCULATED'
    };
  }

  const concerns: string[] = [];
  let score = 100;

  // All legs quoted
  const allLegsQuoted = contracts.every(c => c.bid !== null && c.ask !== null && c.bid > 0 && c.ask > 0);
  if (!allLegsQuoted) {
    score -= 30;
    concerns.push('One or more legs have missing bid/ask quotes.');
  }

  // Narrow spreads (avg spread% < 5%)
  let totalSpreadPct = 0;
  let spreadCount = 0;
  for (const c of contracts) {
    if (c.bid !== null && c.ask !== null) {
      const mid = (c.bid + c.ask) / 2;
      if (mid > 0) {
        totalSpreadPct += (c.ask - c.bid) / mid;
        spreadCount++;
      }
    }
  }
  const avgSpreadPct = spreadCount > 0 ? totalSpreadPct / spreadCount : 1;
  const narrowSpreads = avgSpreadPct < 0.05;
  if (!narrowSpreads) {
    score -= 20;
    concerns.push(`Average bid/ask spread is ${(avgSpreadPct * 100).toFixed(1)}%, which is ≥ 5%.`);
  }

  // Sufficient volume
  const totalVol = contracts.reduce((s, c) => s + (c.volume || 0), 0);
  const avgVolume = totalVol / contracts.length;
  const sufficientVolume = avgVolume >= 100;
  if (!sufficientVolume) {
    score -= 20;
    concerns.push(`Average volume is ${Math.round(avgVolume)}, below the 100 threshold.`);
  }

  // Sufficient open interest
  const totalOIForAvg = contracts.reduce((s, c) => s + (c.openInterest || 0), 0);
  const avgOI = totalOIForAvg / contracts.length;
  const sufficientOpenInterest = avgOI >= 500;
  if (!sufficientOpenInterest) {
    score -= 15;
    concerns.push(`Average open interest is ${Math.round(avgOI)}, below the 500 threshold.`);
  }

  // Cost info availability (always available with DEFAULT_COST_ASSUMPTIONS)
  const costInfoAvailable = true;

  score = Math.max(0, score);

  const classification: ExecutionClassification =
    score >= 80 ? 'HIGH' :
    score >= 50 ? 'MEDIUM' :
    score >= 20 ? 'LOW' : 'UNVERIFIED';

  return {
    classification,
    score,
    allLegsQuoted,
    narrowSpreads,
    sufficientVolume,
    sufficientOpenInterest,
    costInfoAvailable,
    concerns,
    dataSource: 'CALCULATED'
  };
}

// ============================================================
// Module 2: Composite Quality Score
// ============================================================

export interface QualityWeights {
  /** Weight for edge score. Default 0.30 */
  edge: number;
  /** Weight for execution score. Default 0.25 */
  execution: number;
  /** Weight for liquidity score. Default 0.20 */
  liquidity: number;
  /** Weight for data quality score. Default 0.15 */
  dataQuality: number;
  /** Weight for cost certainty score. Default 0.10 */
  costCertainty: number;
}

export const DEFAULT_QUALITY_WEIGHTS: QualityWeights = {
  edge: 0.30,
  execution: 0.25,
  liquidity: 0.20,
  dataQuality: 0.15,
  costCertainty: 0.10
};

export interface QualityScoreComponent {
  rawScore: number;
  weight: number;
  weightedScore: number;
}

export interface QualityScore {
  /** Composite score 0–100 */
  total: number;
  weights: QualityWeights;
  components: {
    edge: QualityScoreComponent;
    execution: QualityScoreComponent;
    liquidity: QualityScoreComponent;
    dataQuality: QualityScoreComponent;
    costCertainty: QualityScoreComponent;
  };
  dataSource: 'CALCULATED';
}

/**
 * Calculates a weighted composite quality score from individual component scores.
 *
 * Methodology:
 * - Each input score is clamped to 0–100.
 * - Weighted sum: Σ(scoreᵢ × weightᵢ)
 * - Total is clamped to 0–100.
 *
 * Default weights (configurable):
 *   Edge: 30%, Execution: 25%, Liquidity: 20%, Data Quality: 15%, Cost Certainty: 10%
 *
 * These weights are NOT universally optimal. They represent a starting configuration
 * that can be adjusted based on the user's trading style and priorities.
 */
export function calculateQualityScore(
  edgeScore: number,
  executionScore: number,
  liquidityScore: number,
  dataQualityScore: number,
  costCertaintyScore: number,
  weights: QualityWeights = DEFAULT_QUALITY_WEIGHTS
): QualityScore {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const components = {
    edge: {
      rawScore: clamp(edgeScore),
      weight: weights.edge,
      weightedScore: clamp(edgeScore) * weights.edge
    },
    execution: {
      rawScore: clamp(executionScore),
      weight: weights.execution,
      weightedScore: clamp(executionScore) * weights.execution
    },
    liquidity: {
      rawScore: clamp(liquidityScore),
      weight: weights.liquidity,
      weightedScore: clamp(liquidityScore) * weights.liquidity
    },
    dataQuality: {
      rawScore: clamp(dataQualityScore),
      weight: weights.dataQuality,
      weightedScore: clamp(dataQualityScore) * weights.dataQuality
    },
    costCertainty: {
      rawScore: clamp(costCertaintyScore),
      weight: weights.costCertainty,
      weightedScore: clamp(costCertaintyScore) * weights.costCertainty
    }
  };

  const total = Math.round(Math.min(100, Math.max(0,
    components.edge.weightedScore +
    components.execution.weightedScore +
    components.liquidity.weightedScore +
    components.dataQuality.weightedScore +
    components.costCertainty.weightedScore
  )));

  return { total, weights, components, dataSource: 'CALCULATED' };
}

// ============================================================
// Module 10: Invalidation Conditions
// ============================================================

export interface InvalidationCondition {
  condition: string;
  severity: 'high' | 'medium' | 'low';
  currentStatus: string;
}

/**
 * Identifies conditions that could eliminate the edge of an opportunity.
 *
 * Every condition is deterministic — generated from measurable facts about
 * the current state of the opportunity.
 *
 * These are NOT predictions. They are things to monitor.
 */
export function identifyInvalidationConditions(
  legs: TradeLeg[],
  contracts: Map<string, OptionContract>,
  edgeAnalysis: EdgeAnalysis,
  liquidityAnalysis: LiquidityAnalysis
): InvalidationCondition[] {
  const conditions: InvalidationCondition[] = [];

  // Check spread widths
  let hasWideSpread = false;
  contracts.forEach((c) => {
    if (c.bid !== null && c.ask !== null) {
      const mid = (c.bid + c.ask) / 2;
      if (mid > 0 && (c.ask - c.bid) / mid > 0.05) {
        hasWideSpread = true;
      }
    }
  });
  if (hasWideSpread) {
    conditions.push({
      condition: 'Bid/ask spread widens further',
      severity: 'high',
      currentStatus: `Current average spread: ${(liquidityAnalysis.spreadPercent * 100).toFixed(1)}%. Already > 5% on at least one leg.`
    });
  }

  // Check volume
  let hasLowVolume = false;
  contracts.forEach((c) => {
    if (c.volume !== null && c.volume < 100) hasLowVolume = true;
    if (c.volume === null) hasLowVolume = true; // no volume means low volume
  });
  if (hasLowVolume) {
    conditions.push({
      condition: 'Liquidity disappears',
      severity: 'high',
      currentStatus: `At least one leg has volume < 100. Exit may be difficult.`
    });
  }

  // Small edge
  if (edgeAnalysis.netEdge < 10 && edgeAnalysis.netEdge > 0) {
    conditions.push({
      condition: 'Small price movement eliminates edge',
      severity: 'high',
      currentStatus: `Net edge is only $${edgeAnalysis.netEdge.toFixed(2)}. A small adverse move could eliminate it.`
    });
  }

  // IV sensitivity
  let hasHighIV = false;
  contracts.forEach((c) => {
    if (c.impliedVolatility !== null && c.impliedVolatility > 0.5) hasHighIV = true;
  });
  if (hasHighIV) {
    conditions.push({
      condition: 'Implied volatility changes',
      severity: 'medium',
      currentStatus: 'At least one leg has IV > 50%. IV crush or expansion could significantly affect the position.'
    });
  }

  // Universal conditions
  conditions.push({
    condition: 'Underlying price changes',
    severity: 'medium',
    currentStatus: 'All option positions are sensitive to underlying price movement.'
  });

  conditions.push({
    condition: 'Quote becomes stale',
    severity: 'medium',
    currentStatus: 'Quoted prices may not reflect current market conditions by the time an order is placed.'
  });

  // Cost sensitivity
  if (edgeAnalysis.estimatedCosts > edgeAnalysis.grossEdge * 0.5) {
    conditions.push({
      condition: 'Transaction costs higher than expected',
      severity: 'medium',
      currentStatus: `Estimated costs ($${edgeAnalysis.estimatedCosts.toFixed(2)}) are > 50% of gross edge ($${edgeAnalysis.grossEdge.toFixed(2)}).`
    });
  }

  conditions.push({
    condition: 'Financing or borrow conditions change',
    severity: 'low',
    currentStatus: 'Interest rates or stock borrow availability could affect strategy economics.'
  });

  return conditions;
}
