import { TradePlan } from '../execution/types';
import { PositionGreeks } from '../portfolio/types';
import { TradeLeg } from '../payoffEngine';

export type PositionStatus = 'PLANNED' | 'READY' | 'ENTERED' | 'OPEN' | 'ADJUSTMENT_NEEDED' | 'EXIT_READY' | 'CLOSED';

export interface LegFill {
  legId: string; // matches TradeLeg.id
  fillPrice: number;
  quantity: number;
  filledAt: number;
}

export interface PositionPnL {
  unrealizedPnL: number | null;
  realizedPnL: number | null;
  returnOnCapital: number | null; // percentage
  marginUtilization: number | null; // how much capital is tied up
}

export interface LivePosition {
  id: string; // unique position id
  planId: string; // reference to the original TradePlan
  underlying: string;
  status: PositionStatus;
  
  // The original plan
  plan: TradePlan;
  
  // Actual executions
  fills: LegFill[];
  enteredAt: number | null;
  closedAt: number | null;
  
  // Current Live State
  currentPnL: PositionPnL;
  currentGreeks: PositionGreeks | null;
  
  // Engine Recommendations
  adjustmentRecommendation: AdjustmentRecommendation | null;
  
  // Event tracking
  upcomingEvents: string[]; // e.g. ["Earnings in 3 days"]
}

export type AdjustmentType = 'ROLL_UP' | 'ROLL_DOWN' | 'ROLL_FORWARD' | 'SCALE_OUT' | 'CLOSE_EARLY' | 'NONE';

export interface AdjustmentRecommendation {
  type: AdjustmentType;
  reason: string;
  suggestedAction: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}
