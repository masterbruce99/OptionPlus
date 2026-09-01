import { OptionContract } from '../providers/MarketDataProvider';

export type ActivityClassification =
  | 'NORMAL ACTIVITY'
  | 'ELEVATED ACTIVITY'
  | 'UNUSUAL ACTIVITY'
  | 'HIGHLY UNUSUAL ACTIVITY'
  | 'INSUFFICIENT DATA';

export interface ActivityFlags {
  sweepDetection: 'UNAVAILABLE';
  blockDetection: 'UNAVAILABLE';
  historicalVolume: 'UNAVAILABLE';
  historicalOi: 'UNAVAILABLE';
  historicalIv: 'UNAVAILABLE';
  individualTradeSize: 'UNAVAILABLE';
  bidAskCross: 'UNAVAILABLE';
}

export interface ActivityCandidate {
  contract: OptionContract;
  
  // Aggregate Metrics
  totalVolume: number;
  openInterest: number;
  volumeToOiRatio: number; // Volume / OI
  
  // Ratios
  putCallVolumeRatio: number | null; // Against total chain
  putCallOiRatio: number | null;     // Against total chain

  // Estimated Notional Premium (Volume * Mid * 100)
  aggregateNotionalPremium: number | null;

  // Analysis
  classification: ActivityClassification;
  activityScore: number; // 0-100 deterministic score
  dataQualityScore: number; // 0-100 indicating missing data points

  // Flags for unsupported / missing data to prevent hallucination
  flags: ActivityFlags;
  
  // Explainability
  reasons: string[];
}
