import { DataAvailabilityStatus } from './types';

export interface HistoricalDividend {
  exDate: string;
  paymentDate: string;
  amount: number;
  source: string;
}

export class HistoricalDividendProvider {
  /**
   * Fetches historical dividends.
   * If unavailable, returns INSUFFICIENT.
   * Backtests should NEVER use today's forward yield to price historical options.
   */
  static async getHistoricalDividends(symbol: string, startDate: string, endDate: string): Promise<{ status: DataAvailabilityStatus, dividends: HistoricalDividend[] }> {
    void symbol;
    void startDate;
    void endDate;
    // Stub implementation to be backed by actual provider
    return {
      status: 'UNAVAILABLE',
      dividends: []
    };
  }
}
