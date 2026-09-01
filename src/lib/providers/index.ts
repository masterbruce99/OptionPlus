import { MarketDataProvider } from './MarketDataProvider';
import { TradierProvider } from './TradierProvider';

export function getProvider(): MarketDataProvider {
  const providerType = process.env.MARKET_DATA_PROVIDER || 'tradier';

  switch (providerType.toLowerCase()) {
    case 'tradier':
      return new TradierProvider();
    default:
      throw new Error(`Unsupported Market Data Provider: ${providerType}`);
  }
}

export * from './MarketDataProvider';
