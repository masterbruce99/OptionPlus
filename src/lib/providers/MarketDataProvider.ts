export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercentage: number;
  volume: number;
}

export interface OptionContract {
  symbol: string;
  underlying: string;
  expiration: string; // YYYY-MM-DD format
  strike: number;
  type: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  greeks: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    rho?: number;
  };
}

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<Quote>;
  getOptionExpirations(symbol: string): Promise<string[]>;
  getOptionChain(symbol: string, expiration: string): Promise<OptionContract[]>;
}
