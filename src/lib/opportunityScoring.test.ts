import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateEdgeQuality,
  calculateLiquidityScore,
  calculateDataQualityScore,
  calculateExecutionScore,
  calculateQualityScore,
  identifyInvalidationConditions,
  DEFAULT_COST_ASSUMPTIONS,
  type QualityWeights
} from './opportunityScoring';
import type { OptionContract } from './providers/MarketDataProvider';
import type { StrategyAnalysis } from './payoffEngine';

// Test helper: create a mock OptionContract with all fields populated
function makeContract(overrides: Partial<OptionContract> = {}): OptionContract {
  return {
    symbol: 'AAPL260918C00150000',
    underlying: 'AAPL',
    expiration: '2026-09-18',
    strike: 150,
    type: 'call',
    bid: 5.00,
    ask: 5.20,
    last: 5.10,
    volume: 2000,
    openInterest: 8000,
    impliedVolatility: 0.30,
    greeks: { delta: 0.55, gamma: 0.03, theta: -0.05, vega: 0.15 },
    ...overrides
  };
}

function makeStrategyAnalysis(overrides: Partial<StrategyAnalysis> = {}): StrategyAnalysis {
  return {
    name: 'Bull Call Spread',
    maxProfit: 300,
    maxLoss: -200,
    breakEvens: [152],
    capitalRequired: 200,
    netDebitCredit: -200,
    payoffData: [],
    ...overrides
  };
}

describe('Opportunity Scoring Engines', () => {

  describe('Edge Quality (Module 3 & 4)', () => {

    it('calculates edge for a debit spread', () => {
      const strategy = makeStrategyAnalysis({ maxProfit: 300, capitalRequired: 200, netDebitCredit: -200 });
      const result = calculateEdgeQuality(strategy, DEFAULT_COST_ASSUMPTIONS, 30, 1);

      assert.strictEqual(result.dataSource, 'CALCULATED');
      assert.strictEqual(result.grossEdge, 300);
      assert.ok(result.estimatedCosts > 0, 'Should have non-zero costs');
      assert.ok(result.netEdge < result.grossEdge, 'Net edge should be less than gross');
      assert.ok(result.returnOnCapital > 0, 'Return on capital should be positive');
      assert.ok(result.annualizedReturn !== null, 'Should annualize for 30 DTE');
      assert.ok(result.annualizationDisclaimer!.includes('unlikely'), 'Should include caveat');
    });

    it('calculates edge for a credit spread', () => {
      const strategy = makeStrategyAnalysis({ maxProfit: 150, capitalRequired: 500, netDebitCredit: 150 });
      const result = calculateEdgeQuality(strategy, DEFAULT_COST_ASSUMPTIONS, 30, 1);

      assert.strictEqual(result.grossEdge, 150); // Credit received
    });

    it('does NOT annualize when DTE < 7', () => {
      const strategy = makeStrategyAnalysis({ maxProfit: 300, capitalRequired: 200, netDebitCredit: -200 });
      const result = calculateEdgeQuality(strategy, DEFAULT_COST_ASSUMPTIONS, 3, 1);

      assert.strictEqual(result.annualizedReturn, null);
      assert.ok(result.annualizationDisclaimer!.includes('misleadingly large'));
    });

    it('does NOT annualize when DTE > 365', () => {
      const strategy = makeStrategyAnalysis({ maxProfit: 300, capitalRequired: 200, netDebitCredit: -200 });
      const result = calculateEdgeQuality(strategy, DEFAULT_COST_ASSUMPTIONS, 500, 1);

      assert.strictEqual(result.annualizedReturn, null);
    });

    it('handles capital-efficient small edge vs large edge correctly', () => {
      // $10 edge on $100 capital = 10% return
      const smallCapital = makeStrategyAnalysis({ maxProfit: 10, capitalRequired: 100, netDebitCredit: -100 });
      const resSmall = calculateEdgeQuality(smallCapital, DEFAULT_COST_ASSUMPTIONS, 30, 1);

      // $1 edge on $100,000 capital = 0.001% return
      const bigCapital = makeStrategyAnalysis({ maxProfit: 1, capitalRequired: 100000, netDebitCredit: -100000 });
      const resBig = calculateEdgeQuality(bigCapital, DEFAULT_COST_ASSUMPTIONS, 30, 1);

      // The small-capital trade should have a much higher returnOnCapital
      assert.ok(resSmall.returnOnCapital > resBig.returnOnCapital,
        'Small capital trade should rank higher by return on capital');
    });

    it('handles zero capital requirement', () => {
      const strategy = makeStrategyAnalysis({ capitalRequired: 0, netDebitCredit: 50 });
      const result = calculateEdgeQuality(strategy, DEFAULT_COST_ASSUMPTIONS, 30, 1);

      assert.strictEqual(result.returnOnCapital, 0);
      assert.strictEqual(result.netEdgePercent, 0);
    });
  });

  describe('Liquidity Score (Module 5)', () => {

    it('scores high-liquidity contracts correctly', () => {
      const contracts = [makeContract({ bid: 5.00, ask: 5.02, volume: 10000, openInterest: 20000 })];
      const result = calculateLiquidityScore(contracts);

      assert.ok(result.score >= 80, `Expected HIGH, got ${result.score}`);
      assert.strictEqual(result.classification, 'HIGH');
      assert.strictEqual(result.dataSource, 'REAL MARKET DATA');
      assert.ok(result.breakdown.length > 0);
    });

    it('scores low-liquidity contracts correctly', () => {
      const contracts = [makeContract({ bid: 0.10, ask: 0.50, volume: 2, openInterest: 10 })];
      const result = calculateLiquidityScore(contracts);

      assert.strictEqual(result.classification, 'LOW');
    });

    it('handles empty contract list', () => {
      const result = calculateLiquidityScore([]);

      assert.strictEqual(result.score, 0);
      assert.strictEqual(result.classification, 'LOW');
    });

    it('shows raw measurements', () => {
      const contracts = [makeContract({ volume: 500, openInterest: 3000 })];
      const result = calculateLiquidityScore(contracts);

      assert.strictEqual(result.avgVolume, 500);
      assert.strictEqual(result.avgOpenInterest, 3000);
      assert.ok(result.spreadPercent > 0);
    });
  });

  describe('Data Quality Score (Module 6)', () => {

    it('scores complete data highly', () => {
      const contracts = [makeContract()];
      const result = calculateDataQualityScore(contracts);

      assert.ok(result.score >= 80, `Expected high score, got ${result.score}`);
      assert.strictEqual(result.hasPricing, true);
      assert.strictEqual(result.hasGreeks, true);
      assert.strictEqual(result.hasIV, true);
    });

    it('penalizes missing fields', () => {
      const contracts = [makeContract({
        bid: 0, ask: 0, last: 0, volume: 0, openInterest: 0,
        impliedVolatility: 0, greeks: {}
      })];
      const result = calculateDataQualityScore(contracts);

      assert.ok(result.score < 50, `Expected low score, got ${result.score}`);
      assert.ok(result.missingFields.length > 0);
    });

    it('handles empty contracts', () => {
      const result = calculateDataQualityScore([]);

      assert.strictEqual(result.score, 0);
      assert.strictEqual(result.hasPricing, false);
    });

    it('detects bid > ask consistency issue', () => {
      const contracts = [makeContract({ bid: 6.00, ask: 5.00 })];
      const result = calculateDataQualityScore(contracts);

      assert.ok(result.consistencyIssues.length > 0);
    });
  });

  describe('Execution Score (Module 7)', () => {

    it('scores well-quoted contracts highly', () => {
      const contracts = [makeContract({ bid: 5.00, ask: 5.05, volume: 5000, openInterest: 10000 })];
      const result = calculateExecutionScore(contracts);

      assert.strictEqual(result.classification, 'HIGH');
      assert.strictEqual(result.allLegsQuoted, true);
      assert.strictEqual(result.concerns.length, 0);
    });

    it('detects missing quotes', () => {
      const contracts = [makeContract({ bid: 0, ask: 5.00 })];
      const result = calculateExecutionScore(contracts);

      assert.strictEqual(result.allLegsQuoted, false);
      assert.ok(result.score < 80);
    });

    it('detects wide spreads', () => {
      const contracts = [makeContract({ bid: 1.00, ask: 2.00, volume: 5000, openInterest: 10000 })];
      const result = calculateExecutionScore(contracts);

      assert.strictEqual(result.narrowSpreads, false);
    });

    it('handles empty contracts', () => {
      const result = calculateExecutionScore([]);

      assert.strictEqual(result.classification, 'UNVERIFIED');
      assert.strictEqual(result.score, 0);
    });
  });

  describe('Composite Quality Score (Module 2)', () => {

    it('calculates weighted composite correctly', () => {
      const result = calculateQualityScore(80, 70, 90, 85, 60);

      assert.ok(result.total > 0 && result.total <= 100);
      assert.strictEqual(result.dataSource, 'CALCULATED');
      assert.ok(result.components.edge.weightedScore > 0);
    });

    it('clamps scores to 0–100', () => {
      const result = calculateQualityScore(150, -20, 90, 85, 60);

      assert.ok(result.total <= 100);
      assert.strictEqual(result.components.edge.rawScore, 100); // Clamped from 150
      assert.strictEqual(result.components.execution.rawScore, 0); // Clamped from -20
    });

    it('respects custom weights', () => {
      const edgeOnly: QualityWeights = { edge: 1.0, execution: 0, liquidity: 0, dataQuality: 0, costCertainty: 0 };
      const result = calculateQualityScore(80, 70, 90, 85, 60, edgeOnly);

      assert.strictEqual(result.total, 80);
    });
  });

  describe('Invalidation Conditions (Module 10)', () => {

    it('always includes universal conditions', () => {
      const legs = [{ id: 'leg1', type: 'call' as const, side: 'long' as const, strike: 150, quantity: 1, entryPrice: 5, multiplier: 100 }];
      const contracts = new Map([['leg1', makeContract()]]);
      const edge = calculateEdgeQuality(makeStrategyAnalysis(), DEFAULT_COST_ASSUMPTIONS, 30, 1);
      const liquidity = calculateLiquidityScore([makeContract()]);

      const conditions = identifyInvalidationConditions(legs, contracts, edge, liquidity);

      const conditionTexts = conditions.map(c => c.condition);
      assert.ok(conditionTexts.includes('Underlying price changes'));
      assert.ok(conditionTexts.includes('Quote becomes stale'));
    });

    it('flags low volume', () => {
      const lowVolContract = makeContract({ volume: 5 });
      const contracts = new Map([['leg1', lowVolContract]]);
      const legs = [{ id: 'leg1', type: 'call' as const, side: 'long' as const, strike: 150, quantity: 1, entryPrice: 5, multiplier: 100 }];
      const edge = calculateEdgeQuality(makeStrategyAnalysis(), DEFAULT_COST_ASSUMPTIONS, 30, 1);
      const liquidity = calculateLiquidityScore([lowVolContract]);

      const conditions = identifyInvalidationConditions(legs, contracts, edge, liquidity);
      const hasLiquidity = conditions.some(c => c.condition.includes('Liquidity disappears'));
      assert.ok(hasLiquidity);
    });
  });
});
