import { strict as assert } from 'node:assert';
import { analyzeActivity } from './engine';
import { OptionContract, Quote } from '../providers/MarketDataProvider';

async function runTests() {
  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void) {
    try {
      fn();
      passed++;
      console.log(`  ✅ ${name}`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${name}`);
      console.error(e);
    }
  }

  console.log('Testing Activity Engine (Phase 11)');

  const mockQuote: Quote = {
    symbol: 'AAPL',
    price: 150,
    change: 1,
    changePercentage: 0.6,
    volume: 10000000
  };

  const createMockContract = (overrides: Partial<OptionContract>): OptionContract => ({
    symbol: 'AAPL240119C00150000',
    underlying: 'AAPL',
    expiration: '2024-01-19',
    strike: 150,
    type: 'call',
    bid: 1.5,
    ask: 1.6,
    last: 1.55,
    volume: 0,
    openInterest: 0,
    impliedVolatility: 0.25,
    greeks: {},
    ...overrides
  });

  runTest('filters out low volume contracts', () => {
    const chain = [
      createMockContract({ volume: 50 }),
      createMockContract({ volume: 500, openInterest: 100 })
    ];
    const results = analyzeActivity(chain, mockQuote, { minVolume: 100, minPremium: 0, minActivityScore: 0 });
    assert.equal(results.length, 1);
    assert.equal(results[0].contract.volume, 500);
  });

  runTest('correctly calculates Volume/OI ratio', () => {
    const chain = [
      createMockContract({ volume: 1000, openInterest: 200 })
    ];
    const results = analyzeActivity(chain, mockQuote, { minVolume: 100, minPremium: 0, minActivityScore: 0 });
    assert.equal(results[0].volumeToOiRatio, 5);
  });

  runTest('handles zero OI gracefully', () => {
    const chain = [
      createMockContract({ volume: 1000, openInterest: 0 })
    ];
    const results = analyzeActivity(chain, mockQuote, { minVolume: 100, minPremium: 0, minActivityScore: 0 });
    assert.equal(results[0].volumeToOiRatio, 1000);
    assert.ok(results[0].reasons.some(r => r.includes('New activity')));
  });

  runTest('estimates aggregate notional premium correctly', () => {
    const chain = [
      createMockContract({ volume: 1000, bid: 1.0, ask: 2.0 }) // Mid = 1.5
    ];
    const results = analyzeActivity(chain, mockQuote, { minVolume: 100, minPremium: 0, minActivityScore: 0 });
    assert.equal(results[0].aggregateNotionalPremium, 150000);
    assert.ok(results[0].reasons.some(r => r.includes('exceeds $100k')));
  });

  runTest('classifies activity correctly based on score', () => {
    const highlyUnusual = createMockContract({ volume: 10000, openInterest: 1000, bid: 5, ask: 5 }); // 5M premium, 10x ratio
    const elevated = createMockContract({ volume: 2000, openInterest: 1000, bid: 0.1, ask: 0.1 }); // 20k premium, 2x ratio
    const results = analyzeActivity([highlyUnusual, elevated], mockQuote, { minVolume: 100, minPremium: 0, minActivityScore: 0 });
    assert.equal(results[0].classification, 'HIGHLY UNUSUAL ACTIVITY');
    assert.equal(results[1].classification, 'ELEVATED ACTIVITY');
  });

  runTest('sets unavailable flags properly', () => {
    const chain = [
      createMockContract({ volume: 500, openInterest: 100 })
    ];
    const results = analyzeActivity(chain, mockQuote, { minVolume: 100, minPremium: 0, minActivityScore: 0 });
    assert.equal(results[0].flags.sweepDetection, 'UNAVAILABLE');
    assert.equal(results[0].flags.blockDetection, 'UNAVAILABLE');
  });

  runTest('calculates chain-level put/call ratios', () => {
    const chain = [
      createMockContract({ type: 'call', volume: 1000, openInterest: 5000 }),
      createMockContract({ type: 'put', volume: 500, openInterest: 10000 }),
    ];
    const results = analyzeActivity(chain, mockQuote, { minVolume: 100, minPremium: 0, minActivityScore: 0 });
    assert.equal(results[0].putCallVolumeRatio, 0.5);
    assert.equal(results[0].putCallOiRatio, 2);
  });

  console.log('\n================================');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
