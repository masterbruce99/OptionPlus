/**
 * Opportunity Ranking Engine — Phase 5 Modules 1, 8, 11–12, 15
 *
 * Deterministic ranking of opportunities for investigation.
 * This is NOT an automatic trading recommendation engine.
 * The system ranks opportunities for investigation, not execution.
 *
 * REAL-DATA RULE: All rankings are derived from real market data
 * passed through the scoring engines. No fabricated opportunities.
 */

import { OptionContract } from './providers/MarketDataProvider';
import { TradeLeg, StrategyAnalysis } from './payoffEngine';
import {
  EdgeAnalysis,
  LiquidityAnalysis,
  DataQualityAnalysis,
  ExecutionAnalysis,
  QualityScore,
  InvalidationCondition,
  CostAssumptions,
  QualityWeights,
  DEFAULT_COST_ASSUMPTIONS,
  DEFAULT_QUALITY_WEIGHTS,
  calculateEdgeQuality,
  calculateLiquidityScore,
  calculateDataQualityScore,
  calculateExecutionScore,
  calculateQualityScore,
  identifyInvalidationConditions
} from './opportunityScoring';

// ============================================================
// Core Types
// ============================================================

export interface RankedOpportunity {
  id: string;
  type: 'arbitrage' | 'strategy';
  underlying: string;
  expiration: string;
  strategy: string;
  grossEdge: number;
  netEdge: number;
  liquidityScore: number;
  dataQualityScore: number;
  executionScore: number;
  capitalRequirement: number;
  riskFlags: string[];
  /** Composite quality score (0–100) */
  confidence: number;
  ranking: number;
  timestamp: number;
  /** Module 8: Structured explanation */
  explanation: OpportunityExplanation;
  /** Module 10: What could go wrong */
  invalidationConditions: InvalidationCondition[];
  /** Raw analysis for drill-down (Module 9) */
  edgeAnalysis: EdgeAnalysis;
  liquidityAnalysis: LiquidityAnalysis;
  dataQualityAnalysis: DataQualityAnalysis;
  executionAnalysis: ExecutionAnalysis;
  qualityScore: QualityScore;
  /** The underlying strategy analysis */
  strategyAnalysis: StrategyAnalysis;
  /** The trade legs */
  legs: TradeLeg[];
}

export interface OpportunityExplanation {
  mainReason: string;
  mainConcern: string;
  whyRankedHere: string;
}

// ============================================================
// Module 11: User-Configurable Investigation Thresholds
// ============================================================

export interface InvestigationThresholds {
  /** Minimum net edge in dollars. Default $25 */
  minNetEdge: number;
  /** Maximum acceptable spread percentage. Default 0.02 (2%) */
  maxSpreadPercent: number;
  /** Minimum liquidity score (0–100). Default 70 */
  minLiquidityScore: number;
  /** Minimum data quality score (0–100). Default 90 */
  minDataQuality: number;
  /** Maximum quote age in seconds. Default 30 */
  maxQuoteAgeSeconds: number;
}

export const DEFAULT_THRESHOLDS: InvestigationThresholds = {
  minNetEdge: 25,
  maxSpreadPercent: 0.02,
  minLiquidityScore: 70,
  minDataQuality: 90,
  maxQuoteAgeSeconds: 30
};

// ============================================================
// Module 12: Opportunity Filtering
// ============================================================

export interface OpportunityFilter {
  underlying?: string;
  strategy?: string;
  expiration?: string;
  minNetEdge?: number;
  minLiquidity?: number;
  minExecution?: number;
  minDataQuality?: number;
  maxCapitalRequired?: number;
  /** 'all' shows everything; 'high_quality' applies thresholds */
  qualityMode: 'all' | 'high_quality';
}

// ============================================================
// Candidate Types (Inputs to ranking)
// ============================================================

/** A strategy-based opportunity candidate */
export interface StrategyCandidate {
  underlying: string;
  expiration: string;
  strategyName: string;
  legs: TradeLeg[];
  contracts: OptionContract[];
  strategyAnalysis: StrategyAnalysis;
  daysToExpiration: number;
  totalContracts: number;
}

/** An arbitrage candidate (placeholder for future implementation) */
export interface ArbitrageCandidate {
  underlying: string;
  expiration: string;
  type: string;
  legs: TradeLeg[];
  contracts: OptionContract[];
  strategyAnalysis: StrategyAnalysis;
  daysToExpiration: number;
  totalContracts: number;
}

// ============================================================
// Module 1: Ranking Engine
// ============================================================

/**
 * Ranks a list of opportunity candidates by composite quality score.
 *
 * Methodology:
 * 1. For each candidate, compute Edge, Liquidity, Data Quality, and Execution scores.
 * 2. Compute composite Quality Score using configurable weights.
 * 3. Apply threshold filters to exclude low-quality opportunities.
 * 4. Sort by composite quality score descending.
 * 5. Assign rank numbers starting from 1.
 * 6. Generate structured explanations for each opportunity.
 *
 * This function does NOT fabricate opportunities. It only scores and ranks
 * candidates that are passed to it from real market data.
 */
export function rankOpportunities(
  candidates: (StrategyCandidate | ArbitrageCandidate)[],
  thresholds: InvestigationThresholds = DEFAULT_THRESHOLDS,
  filter: OpportunityFilter = { qualityMode: 'all' },
  weights: QualityWeights = DEFAULT_QUALITY_WEIGHTS,
  costAssumptions: CostAssumptions = DEFAULT_COST_ASSUMPTIONS
): RankedOpportunity[] {
  const opportunities: RankedOpportunity[] = [];

  for (const candidate of candidates) {
    // Score each dimension
    const edgeAnalysis = calculateEdgeQuality(
      candidate.strategyAnalysis,
      costAssumptions,
      candidate.daysToExpiration,
      candidate.totalContracts
    );

    const liquidityAnalysis = calculateLiquidityScore(candidate.contracts);
    const dataQualityAnalysis = calculateDataQualityScore(candidate.contracts);
    const executionAnalysis = calculateExecutionScore(candidate.contracts);

    // Normalize edge to 0–100 for composite scoring
    // Use returnOnCapital, mapped: >= 20% = 100, 0% = 0
    const edgeNormalized = Math.max(0, Math.min(100, edgeAnalysis.returnOnCapital * 500));

    // Cost certainty: 100 if costs are well-estimated (always true with defaults),
    // reduced if costs are a large fraction of edge
    const costCertainty = edgeAnalysis.grossEdge > 0
      ? Math.max(0, Math.min(100, 100 - (edgeAnalysis.estimatedCosts / edgeAnalysis.grossEdge) * 100))
      : 50;

    const qualityScoreResult = calculateQualityScore(
      edgeNormalized,
      executionAnalysis.score,
      liquidityAnalysis.score,
      dataQualityAnalysis.score,
      costCertainty,
      weights
    );

    // Build contract map for invalidation analysis
    const contractMap = new Map<string, OptionContract>();
    candidate.legs.forEach((leg, i) => {
      if (candidate.contracts[i]) {
        contractMap.set(leg.id, candidate.contracts[i]);
      }
    });

    const invalidationConditions = identifyInvalidationConditions(
      candidate.legs,
      contractMap,
      edgeAnalysis,
      liquidityAnalysis
    );

    // Risk flags
    const riskFlags: string[] = [];
    if (edgeAnalysis.netEdge <= 0) riskFlags.push('NEGATIVE_NET_EDGE');
    if (liquidityAnalysis.classification === 'LOW') riskFlags.push('LOW_LIQUIDITY');
    if (executionAnalysis.classification === 'LOW' || executionAnalysis.classification === 'UNVERIFIED') {
      riskFlags.push('EXECUTION_RISK');
    }
    if (dataQualityAnalysis.score < 70) riskFlags.push('LOW_DATA_QUALITY');
    if (candidate.daysToExpiration <= 7) riskFlags.push('NEAR_EXPIRATION');

    const isArbitrage = 'type' in candidate && (candidate as ArbitrageCandidate).type !== undefined;

    const opportunity: RankedOpportunity = {
      id: `${candidate.underlying}-${candidate.strategyAnalysis.name}-${candidate.expiration}-${Date.now()}`,
      type: isArbitrage ? 'arbitrage' : 'strategy',
      underlying: candidate.underlying,
      expiration: candidate.expiration,
      strategy: candidate.strategyAnalysis.name,
      grossEdge: edgeAnalysis.grossEdge,
      netEdge: edgeAnalysis.netEdge,
      liquidityScore: liquidityAnalysis.score,
      dataQualityScore: dataQualityAnalysis.score,
      executionScore: executionAnalysis.score,
      capitalRequirement: edgeAnalysis.capitalRequired,
      riskFlags,
      confidence: qualityScoreResult.total,
      ranking: 0, // Set after sorting
      timestamp: Date.now(),
      explanation: generateExplanation(edgeAnalysis, liquidityAnalysis, executionAnalysis, dataQualityAnalysis, qualityScoreResult),
      invalidationConditions,
      edgeAnalysis,
      liquidityAnalysis,
      dataQualityAnalysis,
      executionAnalysis,
      qualityScore: qualityScoreResult,
      strategyAnalysis: candidate.strategyAnalysis,
      legs: candidate.legs
    };

    opportunities.push(opportunity);
  }

  // Sort by composite quality score descending
  opportunities.sort((a, b) => b.confidence - a.confidence);

  // Assign rankings
  opportunities.forEach((opp, i) => {
    opp.ranking = i + 1;
  });

  // Apply filters
  return filterOpportunities(opportunities, filter, thresholds);
}

// ============================================================
// Module 12: Filtering
// ============================================================

/**
 * Filters ranked opportunities based on user criteria.
 * When qualityMode is 'all', no threshold filtering is applied.
 * When qualityMode is 'high_quality', thresholds are enforced.
 *
 * Does NOT filter out uncertain opportunities silently when in 'all' mode.
 */
export function filterOpportunities(
  opportunities: RankedOpportunity[],
  filter: OpportunityFilter,
  thresholds: InvestigationThresholds = DEFAULT_THRESHOLDS
): RankedOpportunity[] {
  let result = [...opportunities];

  // User-specified field filters always apply
  if (filter.underlying) {
    result = result.filter(o => o.underlying.toUpperCase() === filter.underlying!.toUpperCase());
  }
  if (filter.strategy) {
    result = result.filter(o => o.strategy.toLowerCase().includes(filter.strategy!.toLowerCase()));
  }
  if (filter.expiration) {
    result = result.filter(o => o.expiration === filter.expiration);
  }
  if (filter.minNetEdge !== undefined) {
    result = result.filter(o => o.netEdge >= filter.minNetEdge!);
  }
  if (filter.minLiquidity !== undefined) {
    result = result.filter(o => o.liquidityScore >= filter.minLiquidity!);
  }
  if (filter.minExecution !== undefined) {
    result = result.filter(o => o.executionScore >= filter.minExecution!);
  }
  if (filter.minDataQuality !== undefined) {
    result = result.filter(o => o.dataQualityScore >= filter.minDataQuality!);
  }
  if (filter.maxCapitalRequired !== undefined) {
    result = result.filter(o => o.capitalRequirement <= filter.maxCapitalRequired!);
  }

  // High quality mode enforces thresholds
  if (filter.qualityMode === 'high_quality') {
    result = result.filter(o =>
      o.netEdge >= thresholds.minNetEdge &&
      o.liquidityScore >= thresholds.minLiquidityScore &&
      o.dataQualityScore >= thresholds.minDataQuality
    );
  }

  return result;
}

// ============================================================
// Module 8: Explanation Generation
// ============================================================

/**
 * Generates structured, fact-based explanations for why an opportunity
 * received its ranking. All language is derived from the actual scores
 * and measurements.
 *
 * Does NOT use vague language like "great trade", "safe", "guaranteed".
 */
export function generateExplanation(
  edge: EdgeAnalysis,
  liquidity: LiquidityAnalysis,
  execution: ExecutionAnalysis,
  dataQuality: DataQualityAnalysis,
  quality: QualityScore
): OpportunityExplanation {
  // Main reason: pick the strongest scoring dimension
  const components = quality.components;
  const bestComponent = Object.entries(components)
    .sort(([, a], [, b]) => b.weightedScore - a.weightedScore)[0];

  let mainReason: string;
  switch (bestComponent[0]) {
    case 'edge':
      mainReason = `Positive modeled edge: net edge $${edge.netEdge.toFixed(2)} after estimated costs of $${edge.estimatedCosts.toFixed(2)}.`;
      break;
    case 'execution':
      mainReason = `${execution.classification} execution feasibility: ${execution.concerns.length === 0 ? 'all checks passed' : execution.concerns.length + ' minor concern(s)'}.`;
      break;
    case 'liquidity':
      mainReason = `${liquidity.classification} measured liquidity: spread ${(liquidity.spreadPercent * 100).toFixed(1)}%, avg volume ${Math.round(liquidity.avgVolume)}.`;
      break;
    case 'dataQuality':
      mainReason = `High data quality score (${dataQuality.score}/100): ${dataQuality.requiredFieldsPresent}/${dataQuality.totalRequiredFields} fields present.`;
      break;
    case 'costCertainty':
      mainReason = `Cost estimates are well-constrained relative to the modeled edge.`;
      break;
    default:
      mainReason = `Composite quality score: ${quality.total}/100.`;
  }

  // Main concern: pick the weakest scoring dimension
  const worstComponent = Object.entries(components)
    .sort(([, a], [, b]) => a.weightedScore - b.weightedScore)[0];

  let mainConcern: string;
  switch (worstComponent[0]) {
    case 'edge':
      if (edge.netEdge <= 0) {
        mainConcern = 'Net edge is zero or negative after estimated transaction costs.';
      } else {
        mainConcern = `Net edge ($${edge.netEdge.toFixed(2)}) may be sensitive to cost assumption changes.`;
      }
      break;
    case 'execution':
      mainConcern = execution.concerns.length > 0
        ? execution.concerns[0]
        : 'Execution feasibility has not been broker-verified.';
      break;
    case 'liquidity':
      mainConcern = liquidity.classification === 'LOW'
        ? `Low measured liquidity. Average spread ${(liquidity.spreadPercent * 100).toFixed(1)}%.`
        : `Liquidity score (${liquidity.score}/100) is the weakest dimension.`;
      break;
    case 'dataQuality':
      mainConcern = dataQuality.missingFields.length > 0
        ? `Incomplete data: ${dataQuality.missingFields.slice(0, 2).join(', ')}.`
        : `Data quality score (${dataQuality.score}/100) is the weakest dimension.`;
      break;
    case 'costCertainty':
      mainConcern = 'Cost assumptions are user-configured estimates, not broker-verified.';
      break;
    default:
      mainConcern = 'Execution not verified with a live broker.';
  }

  const whyRankedHere =
    `Quality score: ${quality.total}/100. ` +
    `Edge: ${components.edge.rawScore.toFixed(0)}/100 (weight ${(components.edge.weight * 100).toFixed(0)}%). ` +
    `Execution: ${components.execution.rawScore.toFixed(0)}/100 (${(components.execution.weight * 100).toFixed(0)}%). ` +
    `Liquidity: ${components.liquidity.rawScore.toFixed(0)}/100 (${(components.liquidity.weight * 100).toFixed(0)}%). ` +
    `Data Quality: ${components.dataQuality.rawScore.toFixed(0)}/100 (${(components.dataQuality.weight * 100).toFixed(0)}%). ` +
    `Cost Certainty: ${components.costCertainty.rawScore.toFixed(0)}/100 (${(components.costCertainty.weight * 100).toFixed(0)}%).`;

  return { mainReason, mainConcern, whyRankedHere };
}

// ============================================================
// Module 15: Change Detection
// ============================================================

export interface OpportunityChange {
  field: string;
  previous: number | string;
  current: number | string;
  direction: 'INCREASED' | 'DECREASED' | 'DISAPPEARED' | 'IMPROVED' | 'DEGRADED' | 'UNCHANGED';
}

/**
 * Compares a previous opportunity snapshot with a current one
 * to detect meaningful changes.
 *
 * Returns a list of changes with direction indicators.
 * Uses actual snapshot comparisons — never modifies historical data.
 */
export function detectChanges(
  previous: RankedOpportunity,
  current: RankedOpportunity
): OpportunityChange[] {
  const changes: OpportunityChange[] = [];

  // Edge comparison
  if (current.netEdge !== previous.netEdge) {
    changes.push({
      field: 'Net Edge',
      previous: previous.netEdge,
      current: current.netEdge,
      direction: current.netEdge > previous.netEdge ? 'INCREASED' : current.netEdge <= 0 ? 'DISAPPEARED' : 'DECREASED'
    });
  }

  // Liquidity comparison
  if (current.liquidityScore !== previous.liquidityScore) {
    changes.push({
      field: 'Liquidity Score',
      previous: previous.liquidityScore,
      current: current.liquidityScore,
      direction: current.liquidityScore > previous.liquidityScore ? 'IMPROVED' : 'DEGRADED'
    });
  }

  // Data quality comparison
  if (current.dataQualityScore !== previous.dataQualityScore) {
    changes.push({
      field: 'Data Quality',
      previous: previous.dataQualityScore,
      current: current.dataQualityScore,
      direction: current.dataQualityScore > previous.dataQualityScore ? 'IMPROVED' : 'DEGRADED'
    });
  }

  // Execution comparison
  if (current.executionScore !== previous.executionScore) {
    changes.push({
      field: 'Execution Score',
      previous: previous.executionScore,
      current: current.executionScore,
      direction: current.executionScore > previous.executionScore ? 'IMPROVED' : 'DEGRADED'
    });
  }

  // Confidence comparison
  if (current.confidence !== previous.confidence) {
    changes.push({
      field: 'Quality Score',
      previous: previous.confidence,
      current: current.confidence,
      direction: current.confidence > previous.confidence ? 'IMPROVED' : 'DEGRADED'
    });
  }

  // Ranking comparison
  if (current.ranking !== previous.ranking) {
    changes.push({
      field: 'Ranking',
      previous: previous.ranking,
      current: current.ranking,
      direction: current.ranking < previous.ranking ? 'IMPROVED' : 'DEGRADED'
    });
  }

  // Capital requirement comparison
  if (current.capitalRequirement !== previous.capitalRequirement) {
    changes.push({
      field: 'Capital Required',
      previous: previous.capitalRequirement,
      current: current.capitalRequirement,
      direction: current.capitalRequirement > previous.capitalRequirement ? 'INCREASED' : 'DECREASED'
    });
  }

  return changes;
}
