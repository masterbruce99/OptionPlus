import { TradeLeg } from '../payoffEngine';
import { MarketView } from '../store'; // we can use the same MarketView

export type ExecutionQuality = 'READY' | 'ACCEPTABLE' | 'CAUTION' | 'BLOCKED' | 'INSUFFICIENT_DATA';

export interface LimitPriceContext {
  bid: number | null;
  ask: number | null;
  midpoint: number | null;
  theoretical: number | null; // e.g. from BSM
  suggestedLimit: number | null;
  acceptableRange: [number, number] | null; // [min, max] acceptable limit price
  debitOrCredit: 'DEBIT' | 'CREDIT' | 'ZERO' | 'UNKNOWN';
}

export interface SlippageAnalysis {
  estimatedSlippage: number | null;
  liquidityPenalty: number | null;
  totalExecutionCost: number | null;
  breakEvenImpact: number | null;
}

export interface PositionSizeResult {
  suggestedQuantity: number;
  maxQuantity: number;
  capitalRequired: number;
  maxLoss: number | null;
  portfolioImpact: string;
}

export interface ExecutionChecklistItem {
  category: 'MARKET' | 'RISK' | 'EVENTS' | 'STRATEGY' | 'EXECUTION';
  label: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';
  reason?: string;
}

export interface TradePlan {
  id: string; // unique plan id
  timestamp: number;
  underlying: string;
  strategyName: string;
  legs: TradeLeg[];
  direction: MarketView;
  thesis: string;
  // Conditions
  entryCondition: string;
  targetPrice: number | null;
  stopPrice: number | null;
  expiration: string | null; // nearest expiration date in legs if applicable
  // Sizing
  maxPlannedLoss: number | null;
  maxPlannedCapital: number | null;
  quantity: number;
  // Execution Context
  limitPrice: LimitPriceContext;
  slippage: SlippageAnalysis;
  executionQuality: ExecutionQuality;
  executionReasons: string[]; // reasons for the execution quality rating
  checklist: ExecutionChecklistItem[];
  // Education
  educationalNote: string;
}

export interface PlanChangeRecord {
  field: string;
  oldValue: string;
  newValue: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}
