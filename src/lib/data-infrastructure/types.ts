export type DataAvailabilityStatus = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE' | 'NOT_SUPPORTED';

export type SamplingFrequency = 'tick' | '1-minute' | '5-minute' | '15-minute' | 'hourly' | 'daily';

// Module 2: Capability Discovery
export interface CapabilityMetadata {
  underlyingHistory: DataAvailabilityStatus;
  optionContracts: DataAvailabilityStatus;
  optionQuotes: DataAvailabilityStatus;
  optionTrades: DataAvailabilityStatus;
  bidAsk: DataAvailabilityStatus;
  volume: DataAvailabilityStatus;
  openInterest: DataAvailabilityStatus;
  impliedVolatility: DataAvailabilityStatus;
  greeks: DataAvailabilityStatus;
  dividends: DataAvailabilityStatus;
  interestRates: DataAvailabilityStatus;
}

// Module 4: Normalized Historical Option Contract
export interface NormalizedHistoricalContract {
  underlying: string;
  symbol: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string; // YYYY-MM-DD
  multiplier: number;
  listingDate: string | null; // Module 6: Contract Lifecycle
  delistingDate: string | null;
  timestamp: number;
  source: string;
}

// Module 5: Historical Quote Model
export interface NormalizedHistoricalQuote {
  timestamp: number;
  bid: number | null;
  ask: number | null;
  last: number | null;
  bidSize: number | null;
  askSize: number | null;
  volume: number | null;
  openInterest: number | null;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  rho: number | null;
  source: string;
}

export interface HistoricalPriceBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Module 8: Data Quality Report
export interface DataQualityReport {
  source: string;
  dateRange: { start: string; end: string };
  underlyingCoverage: number; // percentage 0-1
  optionContractCoverage: number; // percentage 0-1
  quoteCoverage: number; // percentage 0-1
  bidAskCoverage: number; // percentage 0-1
  ivCoverage: number; // percentage 0-1
  greekCoverage: number; // percentage 0-1
  openInterestCoverage: number; // percentage 0-1
  missingDataCount: number;
  duplicateCount: number;
  invalidObservationCount: number;
}

// Module 11: Cache Layer
export interface CacheStatus {
  status: 'CACHE_HIT' | 'CACHE_MISS' | 'PARTIAL_CACHE' | 'REFRESH_REQUIRED';
  cachedRange?: { start: string; end: string };
  missingRange?: { start: string; end: string };
}

// Module 1: Historical Provider Interface
export interface HistoricalProviderInterface {
  name: string;
  
  getCapabilities(): CapabilityMetadata;
  
  getHistoricalUnderlying(
    symbol: string, 
    startDate: string, 
    endDate: string, 
    frequency: SamplingFrequency
  ): Promise<{ status: DataAvailabilityStatus, data: HistoricalPriceBar[], reason?: string }>;
  
  getHistoricalOptionContracts(
    underlying: string, 
    date: string
  ): Promise<{ status: DataAvailabilityStatus, data: NormalizedHistoricalContract[], reason?: string }>;
  
  getHistoricalOptionQuotes(
    symbol: string, // the specific option symbol
    startDate: string,
    endDate: string,
    frequency: SamplingFrequency
  ): Promise<{ status: DataAvailabilityStatus, data: NormalizedHistoricalQuote[], reason?: string }>;
}
