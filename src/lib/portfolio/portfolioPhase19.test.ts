import test from 'node:test';
import assert from 'node:assert';
import { calculateRiskProfile } from './risk';
import * as limitsModule from './limits';
import { evaluatePortfolioLimits, PortfolioLimit } from './limits';
import { PortfolioPosition, PortfolioGreeks, ConcentrationReport } from './types';
import * as hedgingEngineModule from './hedgingEngine';
import { calculateHedgeRequirement, generateHedgeCandidates, compareHedges } from './hedgingEngine';
import * as simulatorEngineModule from './simulatorEngine';
import { simulatePortfolio } from './simulatorEngine';
import { OptionChain } from '../data-infrastructure/types';

test('Portfolio Phase 19: Advanced Optimization & Hedging', async (t) => {

  const mockGreeks: PortfolioGreeks = {
    netDelta: -150,
    netGamma: -5,
    netTheta: 25,
    netVega: -10,
    netRho: 0,
    dollarDelta: -15000, // Say stock is $100
    dollarGamma: -500,
    dollarTheta: 25,
    dollarVega: -100
  };

  const mockConcentration: ConcentrationReport = {
    underlying: { 'AAPL': { capital: 15000, delta: -150, positions: 2 } },
    expiration: {},
    strike: {}
  };

  const mockPositions: PortfolioPosition[] = [
    {
      id: 'pos-1',
      underlying: 'AAPL',
      symbol: 'AAPL231215C150',
      type: 'call',
      strike: 150,
      contracts: 5,
      side: 'short',
      multiplier: 100,
      entryPrice: 5.00,
      currentBid: 5.50,
      currentAsk: 5.60,
      valuationMethod: 'MID',
      timestamp: Date.now(),
      source: 'REAL_DATA',
      greeks: { delta: 0.30, gamma: 0.01, theta: -0.05, vega: 0.02, rho: 0 }
    } // Portfolio is short 5 calls => short delta
  ];

  await t.test('Risk Profile Mapping', () => {
    // With $15k delta and $15k capital, it should be high or critical depending on thresholds
    const profile = calculateRiskProfile(mockGreeks, mockConcentration, 15000);
    assert.strictEqual(profile.directional, 'CRITICAL', 'Delta / baseValue is 1.0 > 0.5 (Critical)');
    assert.strictEqual(profile.concentration, 'CRITICAL', 'Concentration is 100% > 0.6 (Critical)');
    assert.strictEqual(profile.overall, 'CRITICAL');
  });

  await t.test('Portfolio Limits Evaluation', () => {
    const limits: PortfolioLimit[] = [
      {
        id: 'l1',
        metric: 'DELTA',
        operator: 'GREATER_THAN',
        threshold: 10000, // Delta > $10k triggers
        severity: 'CRITICAL',
        enabled: true
      },
      {
        id: 'l2',
        metric: 'MAX_LOSS',
        operator: 'GREATER_THAN',
        threshold: 100,
        severity: 'WARNING',
        enabled: true
      }
    ];

    const alerts = evaluatePortfolioLimits(mockPositions, mockGreeks, mockConcentration, limits);
    assert.strictEqual(alerts.length, 2, 'Should trigger both delta and max loss alerts');
    
    const deltaAlert = alerts.find(a => a.message.includes('Delta'));
    assert.ok(deltaAlert);
    assert.strictEqual(deltaAlert?.priority, 'CRITICAL');
  });

  await t.test('Hedge Requirements & Candidates', () => {
    // Want to neutralize Delta to 0
    const req = calculateHedgeRequirement(mockGreeks, 'DELTA', 0);
    assert.strictEqual(req.requiredChange, 15000, 'Requires +15000 delta to neutralize -15000');
    
    // Generate Candidates
    const chain: OptionChain = {
      symbol: 'AAPL',
      currentPrice: 150,
      expirations: [
        {
          date: '2023-12-15',
          daysToExpiration: 30,
          strikes: [
            {
              strike: 150,
              call: { bid: 5, ask: 5.2, volume: 100, openInterest: 1000, impliedVolatility: 0.3, greeks: { delta: 0.5, gamma: 0.02, theta: -0.04, vega: 0.1, rho: 0 } },
              put: { bid: 4.8, ask: 5.0, volume: 100, openInterest: 1000, impliedVolatility: 0.3, greeks: { delta: -0.5, gamma: 0.02, theta: -0.04, vega: 0.1, rho: 0 } }
            }
          ]
        }
      ]
    };

    const candidates = generateHedgeCandidates(req, 150, chain);
    
    const stockCand = candidates.find(c => c.instrumentType === 'STOCK');
    assert.ok(stockCand);
    assert.strictEqual(stockCand?.contracts, 100, 'Buy 100 shares at $150 to hedge $15000 dollar delta');
    
    const callCand = candidates.find(c => c.instrumentType === 'OPTION' && c.description.includes('Call'));
    assert.ok(callCand);
    // Needed: $15000 delta. Call delta = 0.5 * 100 * 150 = 7500. 15000 / 7500 = 2 contracts
    assert.strictEqual(callCand?.contracts, 2);

    // Compare
    const comparison = compareHedges(mockGreeks, candidates, chain, 150);
    const stockComp = comparison.find(c => c.candidateId === stockCand?.id);
    assert.ok(stockComp);
    assert.strictEqual(stockComp?.deltaAfter, 0); // -15000 + 15000 = 0
  });

  await t.test('What-If Simulator', () => {
    const hypo: PortfolioPosition = {
      underlying: 'AAPL',
      symbol: 'AAPL',
      type: 'stock',
      strike: 0,
      contracts: 100, // buy 100 shares
      side: 'long',
      multiplier: 1,
      entryPrice: 150,
      valuationMethod: 'LAST',
      source: 'HYPOTHETICAL',
      timestamp: 0,
      id: 'h1',
      greeks: { delta: 1, gamma: 0, theta: 0, vega: 0, rho: 0 }
    };

    const sim = simulatePortfolio(mockPositions, [hypo]);
    assert.strictEqual(sim.allPositions.length, 2);
    // Original delta was -150 share equivs (5 short calls * 100 * 0.3).
    // Note: mockPositions had greeks.delta = 0.3, quantity = 5, multiplier = 100, side='short'
    // Total raw delta: -150.
    // Buying 100 shares gives raw delta +100.
    // New raw delta = -50.
    assert.strictEqual(sim.simulatedGreeks.netDelta, -50);
  });

  await t.test('Phase 19 - enforces architectural constraints', () => {
    // Ensure no automated trading endpoints exist
    const limitsExports = Object.keys(limitsModule);
    const hedgingExports = Object.keys(hedgingEngineModule);
    const simulatorExports = Object.keys(simulatorEngineModule);
    
    assert.strictEqual(limitsExports.includes('executeTrade'), false);
    assert.strictEqual(hedgingExports.includes('executeTrade'), false);
    assert.strictEqual(simulatorExports.includes('executeTrade'), false);

    // Stale/Unavailable data handling
    // We already verified the logic degrades gracefully. Let's explicitly test missing greeks.
    const req = calculateHedgeRequirement({ dollarDelta: 0, dollarGamma: 0, dollarVega: 0, dollarTheta: 0 }, 'GAMMA', 100);
    assert.strictEqual(req.requiredChange, 100);
  });
});
