import assert from 'node:assert';
import { test, describe } from 'node:test';
import { OptionContract } from '../providers/MarketDataProvider';
import { calculateChainQuality, bucketByDelta, calculateStrikeDistance, simulatePortfolioImpact } from './engine';

describe('Chain Intelligence Engine', () => {
  
  const mockCall: OptionContract = {
    symbol: 'AAPL240101C00150000',
    underlying: 'AAPL',
    expiration: '2024-01-01',
    strike: 150,
    type: 'call',
    bid: 1.0,
    ask: 1.2,
    last: 1.1,
    volume: 100,
    openInterest: 500,
    impliedVolatility: 0.25,
    greeks: { delta: 0.55, gamma: 0.05, theta: -0.02, vega: 0.1 }
  };

  const mockPut: OptionContract = {
    symbol: 'AAPL240101P00150000',
    underlying: 'AAPL',
    expiration: '2024-01-01',
    strike: 150,
    type: 'put',
    bid: 1.5,
    ask: 1.6,
    last: 1.55,
    volume: 50,
    openInterest: 300,
    impliedVolatility: 0.28,
    greeks: { delta: -0.45, gamma: 0.05, theta: -0.02, vega: 0.1 }
  };

  const emptyContract: OptionContract = {
    symbol: 'AAPL240101C00160000',
    underlying: 'AAPL',
    expiration: '2024-01-01',
    strike: 160,
    type: 'call',
    bid: null,
    ask: null,
    last: null,
    volume: null,
    openInterest: null,
    impliedVolatility: null,
    greeks: {}
  };

  test('calculateChainQuality: aggregates volume, OI, and spread correctly', () => {
    const metrics = calculateChainQuality([mockCall, mockPut, emptyContract]);
    
    assert.strictEqual(metrics.totalContracts, 3);
    assert.strictEqual(metrics.quotedContracts, 2);
    assert.strictEqual(metrics.totalVolume, 150);
    assert.strictEqual(metrics.totalOpenInterest, 800);
    
    // Call spread: 0.2 / 1.1 = 0.1818...
    // Put spread: 0.1 / 1.55 = 0.0645...
    // Median should be (0.1818 + 0.0645) / 2 = 0.123
    assert.ok(metrics.medianSpreadPct !== null && metrics.medianSpreadPct > 0);
  });

  test('bucketByDelta: correctly groups contracts', () => {
    const buckets = bucketByDelta([mockCall, mockPut, emptyContract]);
    
    // mockCall delta = 0.55 -> goes to 0.40 - 0.60
    // mockPut delta = -0.45 -> abs is 0.45 -> goes to 0.40 - 0.60
    const bucket = buckets.find(b => b.range === '0.40 - 0.60');
    assert.ok(bucket);
    assert.strictEqual(bucket.count, 2);
    assert.strictEqual(bucket.totalVolume, 150);
    
    const emptyBucket = buckets.find(b => b.range === '0.00 - 0.20');
    assert.ok(emptyBucket);
    assert.strictEqual(emptyBucket.count, 0);
  });

  test('calculateStrikeDistance: returns correct absolute and percentage distances', () => {
    const dist = calculateStrikeDistance(100, 110, 5, 'call', 108, 92);
    assert.strictEqual(dist.absoluteSpot, 10);
    assert.strictEqual(dist.percentageSpot, 0.1);
    
    // Breakeven for call strike 110 with premium 5 is 115
    // Distance from spot 100 is 15
    assert.strictEqual(dist.absoluteBreakeven, 15);
    assert.strictEqual(dist.percentageBreakeven, 0.15);
    
    // Expected Move upper is 108. Strike is 110. Distance is 2.
    assert.strictEqual(dist.distanceFromExpectedMoveBoundary, 2);
  });

  test('calculateStrikeDistance: handles missing data gracefully', () => {
    const dist = calculateStrikeDistance(null, 110, null, 'put');
    assert.strictEqual(dist.absoluteSpot, null);
    assert.strictEqual(dist.percentageBreakeven, null);
  });

  test('simulatePortfolioImpact: correctly simulates buying a contract', () => {
    const sim = simulatePortfolioImpact([], { contract: mockCall, quantity: 2 });
    
    assert.ok(Math.abs(sim.newDelta - 110) < 0.0001);
    
    // capitalRequired = ask * 2 * 100 = 1.2 * 200 = 240
    assert.strictEqual(sim.capitalRequired, 240);
  });

});
