export type ProbabilityStatus = 'REAL DATA' | 'MODEL ESTIMATE' | 'INSUFFICIENT DATA' | 'UNAVAILABLE';

export interface ExpectedMove {
  status: ProbabilityStatus;
  value: number; // Dollar amount expected move (±)
  percentage: number; // e.g. 0.05 for 5%
  impliedRangeLow: number;
  impliedRangeHigh: number;
  methodology: string;
  source: string;
  assumptions: string[];
}

export interface ProbabilityAnalysis {
  status: ProbabilityStatus;
  probabilityAbove: number | null; // 0-1
  probabilityBelow: number | null; // 0-1
  probabilityITM: number | null;   // 0-1
  probabilityOTM: number | null;   // 0-1
  probabilityOfProfit: number | null; // 0-1
  methodology: string;
  assumptions: string[];
}

export interface VolatilityContext {
  status: ProbabilityStatus;
  currentIV: number | null;
  realizedVolatility10d: number | null;
  realizedVolatility20d: number | null;
  realizedVolatility30d: number | null;
  ivRvSpread: number | null; // currentIV - RV20d
  ivRank: number | null; // 0-100
  ivPercentile: number | null; // 0-100
  historicalObservations: number;
  methodology: string;
  assumptions: string[];
}

export interface HistoricalPrice {
  date: string;
  close: number;
}
