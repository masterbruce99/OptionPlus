/**
 * Phase 4 — Arbitrage & Pricing-Dislocation Engine
 * Core type definitions
 *
 * IMPORTANT: This is an analytical scanner only.
 * No order submission. No brokerage execution.
 */

// ============================================================
// DATA QUALITY
// ============================================================

export type DataQualityStatus = 'VALID' | 'PARTIAL' | 'STALE' | 'INSUFFICIENT';

export interface DataQuality {
  status: DataQualityStatus;
  issues: string[];
  /** Whether underlying quote was present and fresh */
  underlyingValid: boolean;
  /** Whether call bid/ask were present */
  callQuoteValid: boolean;
  /** Whether put bid/ask were present */
  putQuoteValid: boolean;
  /** Whether strike, expiration, multiplier matched */
  contractParamsValid: boolean;
  /** Whether interest rate data was available */
  interestRateValid: boolean;
  /** Whether dividend data was available */
  dividendValid: boolean;
}

// ============================================================
// INTEREST RATE
// ============================================================

export type RateStatus = 'REAL_DATA' | 'UNAVAILABLE';

export interface RateData {
  /** Annualized rate, e.g. 0.053 for 5.3% */
  rate: number;
  source: string;
  observationDate: string;
  maturity: string;
  timestamp: number;
  status: RateStatus;
}

// ============================================================
// DIVIDEND
// ============================================================

export type DividendStatus = 'REAL_DATA' | 'USER_INPUT' | 'UNAVAILABLE';

export interface DividendData {
  /** Annualized dividend per share */
  annualDividend: number;
  /** Continuous dividend yield, e.g. 0.015 */
  continuousYield: number;
  source: string;
  status: DividendStatus;
}

// ============================================================
// COST ENGINE
// ============================================================

export type CostStatus = 'CONFIGURED' | 'UNCONFIGURED';

export interface ArbitrageCostEstimate {
  commission: number;
  exchangeFees: number;
  regulatoryFees: number;
  slippage: number;
  financing: number;
  borrowCost: number;
  /** Total estimated cost per 1 contract (100 shares) */
  totalCost: number;
  status: CostStatus;
  /** If status is UNCONFIGURED, net edge is undetermined */
  netEdgeDetermined: boolean;
}

// ============================================================
// EXECUTION
// ============================================================

export type ExecutionStatus =
  | 'EXECUTABLE'
  | 'EXECUTION_UNCERTAIN'
  | 'NOT_EXECUTABLE'
  | 'INSUFFICIENT_DATA';

export interface ExecutionAssessment {
  status: ExecutionStatus;
  reasons: string[];
  /** Whether bid/ask widths are reasonable */
  spreadsAcceptable: boolean;
  /** Whether volume/OI suggest liquidity */
  liquidityAcceptable: boolean;
  /** Whether quotes are fresh enough to trust */
  quotesFresh: boolean;
}

// ============================================================
// OPPORTUNITY CLASSIFICATION
// ============================================================

export type ArbitrageClassification =
  | 'NO_DISLOCATION'
  | 'THEORETICAL_DISLOCATION'
  | 'POTENTIAL_ARBITRAGE'
  | 'POSITIVE_AFTER_CONFIGURED_COSTS'
  | 'EXECUTION_UNCERTAIN'
  | 'INSUFFICIENT_DATA';

// ============================================================
// ARBITRAGE LEG
// ============================================================

export type LegAction = 'BUY' | 'SELL';
export type LegInstrument = 'CALL' | 'PUT' | 'STOCK';

export interface ArbitrageLeg {
  action: LegAction;
  instrument: LegInstrument;
  strike?: number;
  expiration?: string;
  /** The executable price: BUY uses ask, SELL uses bid */
  executablePrice: number;
  /** Theoretical midpoint for reference only */
  midpoint: number;
  bid: number;
  ask: number;
  quantity: number;
  /** Multiplier (typically 100) */
  multiplier: number;
}

// ============================================================
// PRICING RELATIONSHIP
// ============================================================

export interface PricingRelationship {
  /** The theoretical value computed from first principles */
  theoreticalValue: number;
  /** The market-observable value from quotes */
  marketValue: number;
  /** theoreticalValue - marketValue */
  dislocationType: 'OVERPRICED' | 'UNDERPRICED' | 'FAIR' | 'UNKNOWN';
  difference: number;
  /** Whether the difference exceeds a meaningful threshold */
  significantDislocation: boolean;
}

// ============================================================
// ARBITRAGE CANDIDATE
// ============================================================

export type ArbitrageType =
  | 'PUT_CALL_PARITY'
  | 'SYNTHETIC_STOCK'
  | 'CONVERSION'
  | 'REVERSAL'
  | 'BOX_SPREAD'
  | 'VERTICAL_BOUND';

export interface ArbitrageCandidate {
  id: string;
  type: ArbitrageType;
  underlying: string;
  strike: number;
  /** For box spreads: the higher strike */
  strikeHigh?: number;
  expiration: string;
  legs: ArbitrageLeg[];
  pricingRelationship: PricingRelationship;
  /** Gross edge using executable bid/ask prices — per contract (×100) */
  grossEdge: number;
  /** Gross edge using midpoints — labeled THEORETICAL ONLY */
  theoreticalMidpointEdge: number;
  estimatedCosts: ArbitrageCostEstimate;
  /** grossEdge - estimatedCosts.totalCost */
  netEdge: number | null; // null when costs are UNCONFIGURED
  capitalRequirement: number;
  dataQuality: DataQuality;
  executionAssessment: ExecutionAssessment;
  classification: ArbitrageClassification;
  assumptions: string[];
  /** Human-readable explanation of the opportunity */
  explanation: string;
  /** Specific list of what could eliminate the edge */
  edgeKillers: string[];
  timestamp: number;
  /** For box spreads: implied financing rate */
  impliedFinancingRate?: number;
  /** For box spreads: benchmark rate for comparison */
  benchmarkRate?: number;
}

// ============================================================
// SCAN FILTERS
// ============================================================

export interface ArbitrageScanFilters {
  underlying?: string;
  expiration?: string;
  strategies?: ArbitrageType[];
  /** Only return candidates with netEdge >= this value */
  minimumNetEdge?: number;
  /** Only return candidates where max bid/ask spread <= this */
  maximumSpreadWidth?: number;
  /** Only return candidates above a minimum liquidity threshold */
  minimumLiquidity?: number;
}

// ============================================================
// SCAN RESULT
// ============================================================

export interface ArbitrageScanResult {
  candidates: ArbitrageCandidate[];
  scanTimestamp: number;
  underlying: string;
  expiration: string;
  contractCount: number;
  scanDurationMs: number;
  dataQualityIssues: string[];
}
