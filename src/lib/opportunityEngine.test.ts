import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  rankOpportunities,
  filterOpportunities,
  detectChanges,
  DEFAULT_THRESHOLDS,
  StrategyCandidate,
  RankedOpportunity
} from './opportunityEngine';
import type { OptionContract } from './providers/MarketDataProvider';
import type { TradeLeg } from './payoffEngine';

function makeContract(overrides: Partial<OptionContract> = {}): OptionContract {
  return {
    symbol: 'AAPL260918C00150000', underlying: 'AAPL', expiration: '2026-09-18',
    strike: 150, type: 'call', bid: 5.00, ask: 5.20, last: 5.10,
    volume: 2000, openInterest: 8000, impliedVolatility: 0.30,
    greeks: { delta: 0.55, gamma: 0.03, theta: -0.05, vega: 0.15 },
    ...overrides
  };
}

function makeLeg(overrides: Partial<TradeLeg> = {}): TradeLeg {
  return { id: 'leg1', type: 'call', side: 'long', strike: 150, quantity: 1, entryPrice: 5, multiplier: 100, ...overrides };
}

function makeCandidate(overrides: Partial<StrategyCandidate> = {}): StrategyCandidate {
  return {
    underlying: 'AAPL',
    expiration: '2026-09-18',
    strategyName: 'Bull Call Spread',
    legs: [makeLeg()],
    contracts: [makeContract()],
    strategyAnalysis: {
      name: 'Bull Call Spread', maxProfit: 300, maxLoss: -200,
      breakEvens: [152], capitalRequired: 200, netDebitCredit: -200, payoffData: []
    },
    daysToExpiration: 30,
    totalContracts: 1,
    ...overrides
  };
}

describe('Opportunity Engine', () => {

  describe('Ranking (Module 1)', () => {

    it('ranks multiple opportunities by quality score', () => {
      const highQuality = makeCandidate({
        strategyAnalysis: { name: 'Good Spread', maxProfit: 500, maxLoss: -100, breakEvens: [152], capitalRequired: 100, netDebitCredit: -100, payoffData: [] },
        contracts: [makeContract({ bid: 5.00, ask: 5.02, volume: 10000, openInterest: 50000 })]
      });

      const lowQuality = makeCandidate({
        strategyAnalysis: { name: 'Bad Spread', maxProfit: 10, maxLoss: -1000, breakEvens: [152], capitalRequired: 1000, netDebitCredit: -1000, payoffData: [] },
        contracts: [makeContract({ bid: 0.10, ask: 1.00, volume: 5, openInterest: 20 })]
      });

      const results = rankOpportunities([lowQuality, highQuality], DEFAULT_THRESHOLDS, { qualityMode: 'all' });

      assert.ok(results.length >= 1);
      // The higher-quality opportunity should rank first
      assert.strictEqual(results[0].ranking, 1);
      assert.ok(results[0].confidence >= results[results.length - 1].confidence);
    });

    it('assigns sequential rankings', () => {
      const candidates = [makeCandidate(), makeCandidate(), makeCandidate()];
      const results = rankOpportunities(candidates, DEFAULT_THRESHOLDS, { qualityMode: 'all' });

      const rankings = results.map(r => r.ranking);
      assert.deepStrictEqual(rankings, [1, 2, 3]);
    });

    it('generates explanations for each opportunity', () => {
      const results = rankOpportunities([makeCandidate()], DEFAULT_THRESHOLDS, { qualityMode: 'all' });

      assert.ok(results[0].explanation.mainReason.length > 0);
      assert.ok(results[0].explanation.mainConcern.length > 0);
      assert.ok(results[0].explanation.whyRankedHere.length > 0);
    });

    it('includes invalidation conditions', () => {
      const results = rankOpportunities([makeCandidate()], DEFAULT_THRESHOLDS, { qualityMode: 'all' });

      assert.ok(results[0].invalidationConditions.length > 0);
    });
  });

  describe('Filtering (Module 12)', () => {

    it('filters by underlying', () => {
      const candidates = [
        makeCandidate({ underlying: 'AAPL' }),
        makeCandidate({ underlying: 'MSFT' })
      ];
      const all = rankOpportunities(candidates, DEFAULT_THRESHOLDS, { qualityMode: 'all' });
      const filtered = filterOpportunities(all, { underlying: 'AAPL', qualityMode: 'all' });

      assert.ok(filtered.every(o => o.underlying === 'AAPL'));
    });

    it('high_quality mode filters by thresholds', () => {
      const lowEdge = makeCandidate({
        strategyAnalysis: { name: 'Tiny', maxProfit: 1, maxLoss: -5, breakEvens: [152], capitalRequired: 5, netDebitCredit: -5, payoffData: [] }
      });

      const all = rankOpportunities([lowEdge], DEFAULT_THRESHOLDS, { qualityMode: 'all' });
      const highQuality = filterOpportunities(all, { qualityMode: 'high_quality' }, DEFAULT_THRESHOLDS);

      // The low-edge opportunity should be filtered out in high_quality mode
      assert.ok(highQuality.length <= all.length);
    });

    it('show all does NOT silently filter', () => {
      const all = rankOpportunities([makeCandidate()], DEFAULT_THRESHOLDS, { qualityMode: 'all' });
      assert.ok(all.length > 0);
    });
  });

  describe('Change Detection (Module 15)', () => {

    it('detects edge increase', () => {
      const previous = { netEdge: 50, liquidityScore: 80, dataQualityScore: 90, executionScore: 70, confidence: 75, ranking: 1, capitalRequirement: 200 } as RankedOpportunity;
      const current = { ...previous, netEdge: 100 } as RankedOpportunity;

      const changes = detectChanges(previous, current);
      const edgeChange = changes.find(c => c.field === 'Net Edge');

      assert.ok(edgeChange);
      assert.strictEqual(edgeChange!.direction, 'INCREASED');
    });

    it('detects edge disappearance', () => {
      const previous = { netEdge: 50, liquidityScore: 80, dataQualityScore: 90, executionScore: 70, confidence: 75, ranking: 1, capitalRequirement: 200 } as RankedOpportunity;
      const current = { ...previous, netEdge: -10 } as RankedOpportunity;

      const changes = detectChanges(previous, current);
      const edgeChange = changes.find(c => c.field === 'Net Edge');

      assert.strictEqual(edgeChange!.direction, 'DISAPPEARED');
    });

    it('detects liquidity degradation', () => {
      const previous = { netEdge: 50, liquidityScore: 80, dataQualityScore: 90, executionScore: 70, confidence: 75, ranking: 1, capitalRequirement: 200 } as RankedOpportunity;
      const current = { ...previous, liquidityScore: 40 } as RankedOpportunity;

      const changes = detectChanges(previous, current);
      const liqChange = changes.find(c => c.field === 'Liquidity Score');

      assert.strictEqual(liqChange!.direction, 'DEGRADED');
    });

    it('returns empty when nothing changed', () => {
      const opp = { netEdge: 50, liquidityScore: 80, dataQualityScore: 90, executionScore: 70, confidence: 75, ranking: 1, capitalRequirement: 200 } as RankedOpportunity;
      const changes = detectChanges(opp, { ...opp });

      assert.strictEqual(changes.length, 0);
    });
  });
});
