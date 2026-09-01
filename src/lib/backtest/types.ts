import { OptionContract, Quote } from '../providers/MarketDataProvider';
import { ArbitrageCostEstimate } from '../arbitrage/types';
import { CostConfig } from '../arbitrage/costEngine';

export type StrategyType = 'LONG_CALL' | 'LONG_PUT' | 'COVERED_CALL' | 'CASH_SECURED_PUT' | 'BULL_CALL_SPREAD' | 'BEAR_PUT_SPREAD' | 'BULL_PUT_SPREAD' | 'BEAR_CALL_SPREAD';

// Module 1 & 2: Data Availability & Provider Interfaces
export type DataAvailabilityStatus = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE' | 'INSUFFICIENT';

export interface HistoricalOptionChainData {
  status: DataAvailabilityStatus;
  reason?: string;
  chain: OptionContract[];
  timestamp: number;
}

export interface HistoricalPriceData {
  status: DataAvailabilityStatus;
  reason?: string;
  prices: Quote[];
}

export interface HistoricalMarketDataProvider {
  getHistoricalUnderlying(symbol: string, startDate: string, endDate: string): Promise<HistoricalPriceData>;
  getHistoricalOptionChain(symbol: string, date: string, expiration?: string): Promise<HistoricalOptionChainData>;
}

// Module 3, 5, 6, 7, 8: Configuration and Rules
export type ExpirationRule = 'NEAREST' | 'DTE_RANGE' | 'SPECIFIC_DATE';
export type StrikeRule = 'ATM' | 'PERCENT_OTM' | 'PERCENT_ITM' | 'SPECIFIC_STRIKE';
export type ExecutionAssumption = 'BID_ASK' | 'MIDPOINT'; // Though midpoint isn't recommended without slippage
export type EntryRule = 'DATE' | 'SIGNAL';
export type ExitRule = 'EXPIRATION' | 'SPECIFIED_DATE' | 'PROFIT_TARGET' | 'STOP_LOSS' | 'HOLDING_PERIOD';

export interface BacktestConfig {
  underlying: string;
  strategy: StrategyType; // Reuse Phase 1 strategy types
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  
  entryRule: {
    type: EntryRule;
    value?: string | number;
  };
  
  exitRule: {
    type: ExitRule;
    value?: string | number;
  };

  expirationRule: {
    type: ExpirationRule;
    minDTE?: number;
    maxDTE?: number;
    specificDate?: string;
  };

  strikeRule: {
    type: StrikeRule;
    value?: number; // Target strike or percentage
  };

  positionSize: number; // Number of contracts or capital allocation
  
  executionAssumption: ExecutionAssumption;
  costConfig: CostConfig; // Reuse existing Phase 4 cost configuration
}

// Module 13: Trade Ledger
export interface TradeLedgerEntry {
  id: string;
  status: 'HISTORICAL_BACKTEST';
  entryDate: string;
  exitDate?: string;
  strategy: StrategyType;
  underlying: string;
  contracts: number;
  entryDebitOrCredit: number;
  exitDebitOrCredit?: number;
  grossPnL?: number;
  costs: ArbitrageCostEstimate;
  netPnL?: number;
  holdingPeriodDays?: number;
  exitReason?: string;
  // Module 22: Volatility Context
  entryIV?: number | null;
  exitIV?: number | null;
  // Metadata & Module 24
  dataQuality: DataAvailabilityStatus;
  limitations: string[];
}

// Module 14, 15, 18, 19: Metrics & Drawdown
export interface DrawdownInfo {
  peakDate: string;
  peakValue: number;
  troughDate: string;
  troughValue: number;
  drawdownPercentage: number;
}

export interface PerformanceMetrics {
  totalNetPnL: number;
  returnPercentage: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  maxDrawdown: DrawdownInfo | null;
  tradeCount: number;
  averageHoldingPeriodDays: number;
  
  sampleSizeWarning: boolean;
  
  // Module 16: Equity Curve
  equityCurve: { date: string; cumulativePnL: number; capital: number }[];
}

// Result Type
export interface BacktestResult {
  config: BacktestConfig;
  status: 'VALID_HISTORICAL_ANALYSIS' | 'LIMITED_HISTORICAL_DATA' | 'EXECUTION_ASSUMPTIONS_REQUIRED' | 'INSUFFICIENT_DATA' | 'INVALID_BACKTEST' | 'HISTORICAL_OPTIONS_BACKTEST_UNAVAILABLE_WITH_CURRENT_DATA_SOURCE';
  reason?: string;
  ledger: TradeLedgerEntry[];
  metrics: PerformanceMetrics | null;
}
