import { TradeLeg, StrategyAnalysis } from '../payoffEngine';

export type MarketDirection = 'STRONGLY BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONGLY BEARISH';
export type TimeHorizon = 'VERY SHORT' | 'SHORT' | 'MEDIUM' | 'LONG';
export type VolatilityView = 'EXPECT IV UP' | 'EXPECT IV DOWN' | 'EXPECT IV STABLE' | 'UNKNOWN';
export type ExpectedMovement = 'SMALL' | 'MODERATE' | 'LARGE' | 'UNKNOWN';

export interface MarketView {
  direction: MarketDirection;
  timeHorizon: TimeHorizon;
  volatilityView: VolatilityView;
  expectedMovement: ExpectedMovement;
  expectedMovePercent?: number; // Optional user thesis
}

export interface ScreeningFilters {
  maxCapital: number;
  maxLoss: number;
  minProbabilityOfProfit?: number; // 0 to 100
  minLiquidityScore?: number; // 0 to 100
  minDte: number;
  maxDte: number;
}

export interface ScoreCard {
  directionFit: number;
  timeFit: number;
  volatilityFit: number;
  riskFit: number;
  liquidity: number;
  capitalFit: number;
  totalScore: number;
}

export interface StrategyCandidate {
  id: string; // Unique generated ID
  strategyName: string;
  underlying: string;
  expiration: string;
  legs: TradeLeg[];
  analysis: StrategyAnalysis;
  scoreCard: ScoreCard;
  probabilityOfProfit: number | null; // 0 to 100
  liquidityScore: number; // 0 to 100
  isArbitrage: boolean;
  matchStatus: 'MATCHES YOUR CRITERIA' | 'WORTH INVESTIGATING' | 'DOES NOT MATCH' | 'INSUFFICIENT DATA';
  matchExplanation: string[]; // "WHY IT MATCHES"
  conflictExplanation: string[]; // "WHY IT MAY NOT MATCH"
  warningMessages: string[];
}

export interface SetupSnapshot {
  id: string;
  timestamp: number;
  underlyingPrice: number;
  marketView: MarketView;
  candidate: StrategyCandidate;
  ivAtSnapshot: number | null;
  expectedMoveAtSnapshot: number | null;
}
