import { 
  CapabilityMetadata, 
  DataAvailabilityStatus, 
  HistoricalProviderInterface,
  HistoricalPriceBar,
  NormalizedHistoricalContract,
  NormalizedHistoricalQuote,
  SamplingFrequency
} from './types';

export abstract class AbstractHistoricalProvider implements HistoricalProviderInterface {
  abstract name: string;
  abstract getCapabilities(): CapabilityMetadata;

  async getHistoricalUnderlying(
    symbol: string, 
    startDate: string, 
    endDate: string, 
    frequency: SamplingFrequency
  ): Promise<{ status: DataAvailabilityStatus, data: HistoricalPriceBar[], reason?: string }> {
    if (this.getCapabilities().underlyingHistory === 'UNAVAILABLE' || this.getCapabilities().underlyingHistory === 'NOT_SUPPORTED') {
      return { status: 'UNAVAILABLE', data: [], reason: 'Provider does not support historical underlying data.' };
    }
    return this.fetchHistoricalUnderlying(symbol, startDate, endDate, frequency);
  }

  async getHistoricalOptionContracts(
    underlying: string, 
    date: string
  ): Promise<{ status: DataAvailabilityStatus, data: NormalizedHistoricalContract[], reason?: string }> {
    if (this.getCapabilities().optionContracts === 'UNAVAILABLE' || this.getCapabilities().optionContracts === 'NOT_SUPPORTED') {
      return { status: 'UNAVAILABLE', data: [], reason: 'Provider does not support historical option contracts.' };
    }
    return this.fetchHistoricalOptionContracts(underlying, date);
  }

  async getHistoricalOptionQuotes(
    symbol: string, 
    startDate: string,
    endDate: string,
    frequency: SamplingFrequency
  ): Promise<{ status: DataAvailabilityStatus, data: NormalizedHistoricalQuote[], reason?: string }> {
    if (this.getCapabilities().optionQuotes === 'UNAVAILABLE' || this.getCapabilities().optionQuotes === 'NOT_SUPPORTED') {
      return { status: 'UNAVAILABLE', data: [], reason: 'Provider does not support historical option quotes.' };
    }
    return this.fetchHistoricalOptionQuotes(symbol, startDate, endDate, frequency);
  }

  // Abstract methods for subclasses to implement the actual data fetching logic
  protected abstract fetchHistoricalUnderlying(symbol: string, startDate: string, endDate: string, frequency: SamplingFrequency): Promise<{ status: DataAvailabilityStatus, data: HistoricalPriceBar[], reason?: string }>;
  protected abstract fetchHistoricalOptionContracts(underlying: string, date: string): Promise<{ status: DataAvailabilityStatus, data: NormalizedHistoricalContract[], reason?: string }>;
  protected abstract fetchHistoricalOptionQuotes(symbol: string, startDate: string, endDate: string, frequency: SamplingFrequency): Promise<{ status: DataAvailabilityStatus, data: NormalizedHistoricalQuote[], reason?: string }>;
}

export class DefaultHistoricalProvider extends AbstractHistoricalProvider {
  name = 'Default (Unconfigured)';

  getCapabilities(): CapabilityMetadata {
    return {
      underlyingHistory: 'NOT_SUPPORTED',
      optionContracts: 'NOT_SUPPORTED',
      optionQuotes: 'NOT_SUPPORTED',
      optionTrades: 'NOT_SUPPORTED',
      bidAsk: 'NOT_SUPPORTED',
      volume: 'NOT_SUPPORTED',
      openInterest: 'NOT_SUPPORTED',
      impliedVolatility: 'NOT_SUPPORTED',
      greeks: 'NOT_SUPPORTED',
      dividends: 'NOT_SUPPORTED',
      interestRates: 'NOT_SUPPORTED'
    };
  }

  protected async fetchHistoricalUnderlying(): Promise<{ status: DataAvailabilityStatus, data: HistoricalPriceBar[], reason?: string }> {
    return { status: 'UNAVAILABLE', data: [], reason: 'PROVIDER NOT CONFIGURED' };
  }

  protected async fetchHistoricalOptionContracts(): Promise<{ status: DataAvailabilityStatus, data: NormalizedHistoricalContract[], reason?: string }> {
    return { status: 'UNAVAILABLE', data: [], reason: 'PROVIDER NOT CONFIGURED' };
  }

  protected async fetchHistoricalOptionQuotes(): Promise<{ status: DataAvailabilityStatus, data: NormalizedHistoricalQuote[], reason?: string }> {
    return { status: 'UNAVAILABLE', data: [], reason: 'PROVIDER NOT CONFIGURED' };
  }
}
