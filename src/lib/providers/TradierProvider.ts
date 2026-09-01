import { MarketDataProvider, OptionContract, Quote } from './MarketDataProvider';

export class TradierProvider implements MarketDataProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.TRADIER_API_KEY || '';
    // Use sandbox by default if not specified, though for real data users often use production.
    this.baseUrl = process.env.TRADIER_BASE_URL || 'https://sandbox.tradier.com/v1';
    
    if (!this.apiKey) {
      console.warn('TRADIER_API_KEY is not configured.');
    }
  }

  private async fetchTradier(endpoint: string) {
    if (!this.apiKey) {
      throw new Error('Provider Not Configured: TRADIER_API_KEY is missing.');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      },
      next: { revalidate: 0 } // no caching for real-time market data
    });

    if (!response.ok) {
      throw new Error(`Tradier API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getQuote(symbol: string): Promise<Quote> {
    const data = await this.fetchTradier(`/markets/quotes?symbols=${encodeURIComponent(symbol)}`);
    const quotes = data.quotes?.quote;
    
    if (!quotes || (Array.isArray(quotes) && quotes.length === 0)) {
      throw new Error(`Quote not found for symbol: ${symbol}`);
    }

    // Tradier returns either an array or a single object depending on if multiple symbols were matched
    const quote = Array.isArray(quotes) ? quotes[0] : quotes;

    return {
      symbol: quote.symbol,
      price: typeof quote.last === 'number' ? quote.last : null,
      change: typeof quote.change === 'number' ? quote.change : null,
      changePercentage: typeof quote.change_percentage === 'number' ? quote.change_percentage : null,
      volume: typeof quote.volume === 'number' ? quote.volume : null
    };
  }

  async getOptionExpirations(symbol: string): Promise<string[]> {
    const data = await this.fetchTradier(`/markets/options/expirations?symbol=${encodeURIComponent(symbol)}&includeAllRoots=true`);
    const expirations = data.expirations?.date;
    
    if (!expirations) {
      return [];
    }

    return Array.isArray(expirations) ? expirations : [expirations];
  }

  async getOptionChain(symbol: string, expiration: string): Promise<OptionContract[]> {
    const data = await this.fetchTradier(`/markets/options/chains?symbol=${encodeURIComponent(symbol)}&expiration=${encodeURIComponent(expiration)}&greeks=true`);
    const options = data.options?.option;
    
    if (!options) {
      return [];
    }

    const chain = Array.isArray(options) ? options : [options];

    interface TradierOptionResponse {
      symbol: string; underlying: string; expiration_date: string;
      strike: number; option_type: string;
      bid: number; ask: number; last: number;
      volume: number; open_interest: number;
      greeks?: { mid_iv?: number; smv_vol?: number; delta?: number; gamma?: number; theta?: number; vega?: number; rho?: number };
    }

    return chain.map((opt: TradierOptionResponse) => ({
      symbol: opt.symbol,
      underlying: opt.underlying,
      expiration: opt.expiration_date,
      strike: opt.strike,
      type: opt.option_type === 'call' ? 'call' : 'put',
      bid: typeof opt.bid === 'number' ? opt.bid : null,
      ask: typeof opt.ask === 'number' ? opt.ask : null,
      last: typeof opt.last === 'number' ? opt.last : null,
      volume: typeof opt.volume === 'number' ? opt.volume : null,
      openInterest: typeof opt.open_interest === 'number' ? opt.open_interest : null,
      impliedVolatility: typeof opt.greeks?.mid_iv === 'number' ? opt.greeks.mid_iv : (typeof opt.greeks?.smv_vol === 'number' ? opt.greeks.smv_vol : null),
      greeks: {
        delta: typeof opt.greeks?.delta === 'number' ? opt.greeks.delta : null,
        gamma: typeof opt.greeks?.gamma === 'number' ? opt.greeks.gamma : null,
        theta: typeof opt.greeks?.theta === 'number' ? opt.greeks.theta : null,
        vega: typeof opt.greeks?.vega === 'number' ? opt.greeks.vega : null,
        rho: typeof opt.greeks?.rho === 'number' ? opt.greeks.rho : null,
      }
    }));
  }
}
