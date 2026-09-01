import { OptionContract } from '../providers/MarketDataProvider';

export interface ChainQualityMetrics {
  totalContracts: number;
  quotedContracts: number; // Contacts with both bid and ask
  averageSpreadPct: number | null;
  medianSpreadPct: number | null;
  totalVolume: number;
  totalOpenInterest: number;
  timestamp: string;
}

export interface DeltaBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  avgIV: number | null;
  avgTheta: number | null;
  avgVega: number | null;
  avgSpreadPct: number | null;
  totalVolume: number;
  totalOI: number;
}

export interface StrikeDistance {
  absoluteSpot: number | null;
  percentageSpot: number | null;
  absoluteBreakeven: number | null;
  percentageBreakeven: number | null;
  distanceFromExpectedMoveBoundary: number | null;
}

export interface HypotheticalPosition {
  contract: OptionContract;
  quantity: number; // Positive for long, negative for short
}

export interface SimulatedImpact {
  currentDelta: number;
  newDelta: number;
  currentGamma: number;
  newGamma: number;
  currentTheta: number;
  newTheta: number;
  currentVega: number;
  newVega: number;
  capitalRequired: number; // positive means debit, negative means credit
}
