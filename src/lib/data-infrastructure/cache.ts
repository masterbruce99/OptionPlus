import { CacheStatus, SamplingFrequency } from './types';

export class HistoricalCacheManager {
  private static instance: HistoricalCacheManager;
  private cache: Map<string, unknown> = new Map();

  private constructor() {}

  static getInstance(): HistoricalCacheManager {
    if (!this.instance) {
      this.instance = new HistoricalCacheManager();
    }
    return this.instance;
  }

  private generateKey(provider: string, symbol: string, type: 'underlying' | 'quotes' | 'contracts', frequency?: SamplingFrequency): string {
    return `${provider}:${symbol}:${type}${frequency ? ':' + frequency : ''}`;
  }

  // We are keeping this simple and in-memory for the abstraction phase
  // Real implementation would connect to IndexedDB or Redis
  
  checkCacheStatus(provider: string, symbol: string, type: 'underlying' | 'quotes' | 'contracts', startDate: string, endDate: string, frequency?: SamplingFrequency): CacheStatus {
    const key = this.generateKey(provider, symbol, type, frequency);
    const hasData = this.cache.has(key);
    
    if (hasData) {
      // Simplistic check for demonstration of cache status logic
      // Real check would intersect date ranges
      return {
        status: 'CACHE_HIT',
        cachedRange: { start: startDate, end: endDate }
      };
    }

    return {
      status: 'CACHE_MISS',
      missingRange: { start: startDate, end: endDate }
    };
  }

  set(provider: string, symbol: string, type: 'underlying' | 'quotes' | 'contracts', data: unknown, frequency?: SamplingFrequency): void {
    const key = this.generateKey(provider, symbol, type, frequency);
    this.cache.set(key, data);
  }

  get(provider: string, symbol: string, type: 'underlying' | 'quotes' | 'contracts', frequency?: SamplingFrequency): unknown {
    const key = this.generateKey(provider, symbol, type, frequency);
    return this.cache.get(key) || null;
  }
}
