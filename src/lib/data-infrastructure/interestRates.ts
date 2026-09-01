import { DataAvailabilityStatus } from './types';

export interface HistoricalInterestRate {
  date: string;
  rate: number; // e.g. 0.045 for 4.5%
  source: string;
}

export class HistoricalInterestRateProvider {
  /**
   * Fetches historical risk-free rate for a given period.
   * Backtests requiring financing should use rates appropriate to the historical period.
   * Do not use today's rate across historical years.
   */
  static async getHistoricalRate(date: string): Promise<{ status: DataAvailabilityStatus, rate: number | null }> {
    void date;
    // Stub implementation to be backed by actual provider or Treasury API
    return {
      status: 'UNAVAILABLE',
      rate: null
    };
  }
}
