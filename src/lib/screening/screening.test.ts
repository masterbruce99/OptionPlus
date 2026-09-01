import { strict as assert } from 'node:assert';
import { generateCandidates } from './engine';
import { MarketView, ScreeningFilters } from './types';
import { OptionContract } from '../providers/marketDataProvider';

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

  console.log('\nTesting Trade Setup & Strategy Screening Engine\n');

  const dummyChain: OptionContract[] = [
    {
      symbol: 'AAPL260901C00150000', underlying: 'AAPL', expiration: '2026-10-01', strike: 150, type: 'call',
      bid: 5.00, ask: 5.20, last: 5.10, volume: 100, openInterest: 500, impliedVolatility: 0.25,
      greeks: { delta: 0.5 }
    },
    {
      symbol: 'AAPL260901C00155000', underlying: 'AAPL', expiration: '2026-10-01', strike: 155, type: 'call',
      bid: 2.00, ask: 2.20, last: 2.10, volume: 100, openInterest: 500, impliedVolatility: 0.25,
      greeks: { delta: 0.3 }
    },
    {
      symbol: 'AAPL260901P00150000', underlying: 'AAPL', expiration: '2026-10-01', strike: 150, type: 'put',
      bid: 4.80, ask: 5.00, last: 4.90, volume: 100, openInterest: 500, impliedVolatility: 0.25,
      greeks: { delta: -0.5 }
    }
  ];

  const baseView: MarketView = {
    direction: 'BULLISH',
    timeHorizon: 'MEDIUM',
    volatilityView: 'UNKNOWN',
    expectedMovement: 'MODERATE'
  };

  const baseFilters: ScreeningFilters = {
    maxCapital: 5000,
    maxLoss: 1000,
    minDte: 10,
    maxDte: 45
  };

  runTest('generates bullish candidates and rejects based on maxLoss', () => {
    let filters = { ...baseFilters, maxLoss: 400 };
    let candidates = generateCandidates(dummyChain, 150, baseView, filters);
    
    assert.equal(candidates.some(c => c.strategyName === 'Long Call' && c.legs[0].strike === 150), false);
    assert.equal(candidates.some(c => c.strategyName === 'Long Call' && c.legs[0].strike === 155), true);
    assert.equal(candidates.some(c => c.strategyName === 'Bull Call Spread'), true);

    filters.maxLoss = 600;
    candidates = generateCandidates(dummyChain, 150, baseView, filters);
    assert.equal(candidates.some(c => c.strategyName === 'Long Call' && c.legs[0].strike === 150), true);
  });

  runTest('evaluates thesis consistency correctly', () => {
    const candidates = generateCandidates(dummyChain, 150, baseView, baseFilters);
    const spread = candidates.find(c => c.strategyName === 'Bull Call Spread');
    
    assert.ok(spread);
    assert.ok(spread.matchExplanation.includes('Direction: The strategy benefits from an upward move.'));
    assert.ok(spread.matchExplanation.includes('Risk: The trade has strictly defined risk.'));
  });
  
  runTest('handles contradictory inputs by returning empty or DOES NOT MATCH', () => {
    const bearishView = { ...baseView, direction: 'BEARISH' as const };
    const candidates = generateCandidates(dummyChain, 150, bearishView, baseFilters);
    
    assert.equal(candidates.some(c => c.strategyName === 'Long Call'), false);
    assert.equal(candidates.some(c => c.strategyName === 'Long Put'), true);
  });

  console.log('\n================================');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

runTests();
