export interface Quote {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercentage: number | null;
  volume: number | null;
}

export interface OptionContract {
  symbol: string;
  underlying: string;
  expiration: string; // YYYY-MM-DD format
  strike: number;
  type: 'call' | 'put';
  bid: number | null;
  ask: number | null;
  last: number | null;
  volume: number | null;
  openInterest: number | null;
  impliedVolatility: number | null;
  greeks: {
    delta?: number | null;
    gamma?: number | null;
    theta?: number | null;
    vega?: number | null;
    rho?: number | null;
  };
}

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<Quote>;
  getOptionExpirations(symbol: string): Promise<string[]>;
  getOptionChain(symbol: string, expiration: string): Promise<OptionContract[]>;
}
