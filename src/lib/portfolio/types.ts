export interface PositionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export type ValuationMethod = 'BID' | 'ASK' | 'MID' | 'USER_DEFINED' | 'LAST';

export interface PortfolioPosition {
  id: string; // unique position ID
  underlying: string;
  symbol: string; // option symbol or ticker if stock
  type: 'call' | 'put' | 'stock';
  strike: number; // 0 for stock
  expiration?: string; // YYYY-MM-DD
  contracts: number; // absolute number
  side: 'long' | 'short';
  multiplier: number; // usually 100 for options, 1 for stock
  
  entryPrice: number;
  currentBid?: number;
  currentAsk?: number;
  currentLast?: number;
  userMark?: number; // Optional override
  
  greeks?: PositionGreeks;
  iv?: number; // implied volatility
  
  timestamp: number;
  source: 'REAL_DATA' | 'USER_INPUT' | 'SIMULATED';
  valuationMethod: ValuationMethod;
}

export interface PortfolioGreeks {
  netDelta: number; // raw delta
  netGamma: number;
  netTheta: number;
  netVega: number;
  netRho: number;
  
  // Dollar sensitivities
  dollarDelta: number; // e.g. equivalent share exposure
  dollarGamma: number;
  dollarTheta: number; // Daily decay in $
  dollarVega: number; // Sensitivity per 1% IV change in $
}

export interface ConcentrationReport {
  underlying: Record<string, { capital: number; delta: number; positions: number }>;
  expiration: Record<string, { capital: number; delta: number; positions: number }>;
  strike: Record<string, { capital: number; delta: number; positions: number }>;
}

export type RiskSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface RiskWarning {
  id: string;
  type: 'CONCENTRATION' | 'GREEK_EXPOSURE' | 'ASSIGNMENT' | 'EXERCISE' | 'EXPIRATION' | 'DATA_QUALITY';
  severity: RiskSeverity;
  message: string;
  affectedPositions?: string[];
}

export interface ScenarioResult {
  priceChange: number; // percentage (e.g. -0.1 for -10%)
  ivChange: number; // percentage points (e.g. 5 for +5%)
  daysForward: number; // days elapsed (for theta)
  projectedPnL: number;
  notes: string[];
}

export interface PortfolioSnapshot {
  id: string;
  timestamp: number;
  positions: PortfolioPosition[];
  portfolioGreeks: PortfolioGreeks;
  currentTotalPnL: number;
  capitalRequirement: number;
  notionalExposure: number;
  warnings: RiskWarning[];
}
