import { MarketDataProvider } from '../providers/MarketDataProvider';
import { 
  HistoricalMarketDataProvider, 
  HistoricalPriceData, 
  HistoricalOptionChainData 
} from './types';

export class DefaultHistoricalProvider implements HistoricalMarketDataProvider {
  private currentProvider?: MarketDataProvider;

  constructor(currentProvider?: MarketDataProvider) {
    this.currentProvider = currentProvider;
  }

  async getHistoricalUnderlying(_symbol: string, _startDate: string, _endDate: string): Promise<HistoricalPriceData> {
    // In a real implementation with a historical-capable provider, this would fetch historical bars.
    // For now, we report INSUFFICIENT unless we had a specific historical API.
    // However, if we just want to stub it:
    return {
      status: 'INSUFFICIENT',
      reason: 'Standard provider does not support historical daily bar queries without specialized endpoints.',
      prices: []
    };
  }

  async getHistoricalOptionChain(_symbol: string, _date: string, _expiration?: string): Promise<HistoricalOptionChainData> {
    // Strictly adheres to Phase 6 Module 28:
    // "For insufficient historical option data: display clearly: HISTORICAL OPTIONS BACKTEST UNAVAILABLE WITH CURRENT DATA SOURCE"
    // "Do not create fake bid/ask values."
    return {
      status: 'UNAVAILABLE',
      reason: 'HISTORICAL OPTIONS BACKTEST UNAVAILABLE WITH CURRENT DATA SOURCE. Tradier standard API does not provide point-in-time historical option chains and Greeks.',
      chain: [],
      timestamp: Date.now()
    };
  }
}
