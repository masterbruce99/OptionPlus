import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { calculateLimitPrice } from './limitPriceEngine';
import { calculateSlippage } from './slippageEngine';
import { calculatePositionSize } from './positionSizer';
import { validateEntry } from './entryValidation';
import { generateChecklist } from './checklistEngine';
import { detectPlanChanges } from './planChangeEngine';
import { TradePlan } from './types';
import { StrategyAnalysis } from '../payoffEngine';

describe('Execution Engines', () => {

  describe('Limit Price Engine', () => {
    it('calculates limit prices for a debit spread', () => {
      const legs = [
        {
          leg: { id: '1', type: 'call' as const, side: 'long' as const, strike: 100, quantity: 1, entryPrice: 0, multiplier: 100 },
          bid: 2.00, ask: 2.20
        },
        {
          leg: { id: '2', type: 'call' as const, side: 'short' as const, strike: 105, quantity: 1, entryPrice: 0, multiplier: 100 },
          bid: 1.00, ask: 1.10
        }
      ];

      const res = calculateLimitPrice(legs);
      // User buys long leg: conservative = bid ($2.00), aggressive = ask ($2.20)
      // User sells short leg: conservative = ask ($1.10), aggressive = bid ($1.00)
      // Conservative Entry (best): 2.00 * 100 - 1.10 * 100 = 200 - 110 = 90
      // Aggressive Entry (worst): 2.20 * 100 - 1.00 * 100 = 220 - 100 = 120

      assert.strictEqual(res.bid, 90);
      assert.strictEqual(res.ask, 120);
      assert.strictEqual(res.midpoint, 105);
      assert.strictEqual(res.debitOrCredit, 'DEBIT');
    });

    it('calculates limit prices for a credit spread', () => {
      const legs = [
        {
          leg: { id: '1', type: 'put' as const, side: 'short' as const, strike: 100, quantity: 1, entryPrice: 0, multiplier: 100 },
          bid: 2.00, ask: 2.20
        },
        {
          leg: { id: '2', type: 'put' as const, side: 'long' as const, strike: 95, quantity: 1, entryPrice: 0, multiplier: 100 },
          bid: 1.00, ask: 1.10
        }
      ];

      const res = calculateLimitPrice(legs);
      // User sells short leg: conservative = ask ($2.20), aggressive = bid ($2.00)
      // User buys long leg: conservative = bid ($1.00), aggressive = ask ($1.10)
      // Conservative Entry: -220 + 100 = -120 (credit of 120)
      // Aggressive Entry: -200 + 110 = -90 (credit of 90)

      assert.strictEqual(res.bid, -120);
      assert.strictEqual(res.ask, -90);
      assert.strictEqual(res.midpoint, -105);
      assert.strictEqual(res.debitOrCredit, 'CREDIT');
    });

    it('returns unknown/null when quotes are missing', () => {
      const res = calculateLimitPrice([
        {
          leg: { id: '1', type: 'call' as const, side: 'long' as const, strike: 100, quantity: 1, entryPrice: 0, multiplier: 100 },
          bid: null, ask: 2.20
        }
      ]);
      assert.strictEqual(res.bid, null);
      assert.strictEqual(res.midpoint, null);
    });
  });

  describe('Slippage Engine', () => {
    it('estimates slippage correctly', () => {
      const legs = [
        {
          leg: { id: '1', type: 'call' as const, side: 'long' as const, strike: 100, quantity: 1, entryPrice: 0, multiplier: 100 },
          bid: 2.00, ask: 2.20
        }
      ];
      // ask = 220, bid = 200, spread = 20
      // normal liquidity volume > 500, penalty = 0
      const res = calculateSlippage(legs, [1000]);
      assert.strictEqual(res.estimatedSlippage, 5); // 25% of spread
      assert.strictEqual(res.liquidityPenalty, 0);
      assert.strictEqual(res.totalExecutionCost, 5);
    });

    it('applies liquidity penalty on low volume', () => {
      const legs = [
        {
          leg: { id: '1', type: 'call' as const, side: 'long' as const, strike: 100, quantity: 1, entryPrice: 0, multiplier: 100 },
          bid: 2.00, ask: 2.20
        }
      ];
      const res = calculateSlippage(legs, [10]); // volume 10 -> penalty 0.5 * spread
      assert.strictEqual(res.estimatedSlippage, 5); // 0.25 * 20
      assert.strictEqual(res.liquidityPenalty, 10); // 0.5 * 20
      assert.strictEqual(res.totalExecutionCost, 15);
    });
  });

  describe('Position Sizer', () => {
    it('sizes correctly based on max dollar risk', () => {
      const analysis: StrategyAnalysis = {
        name: 'Long Call',
        maxProfit: null,
        maxLoss: 150,
        breakEvens: [],
        capitalRequired: 150,
        netDebitCredit: -150,
        payoffData: []
      };
      
      const res = calculatePositionSize(analysis, {
        maxDollarRisk: 500,
        maxCapitalAllocation: 1000,
        portfolioRiskLimit: null
      });

      // 500 / 150 = 3
      assert.strictEqual(res.suggestedQuantity, 3);
      assert.strictEqual(res.maxQuantity, 3);
      assert.strictEqual(res.maxLoss, 450);
      assert.strictEqual(res.portfolioImpact, 'HIGH'); // 450/500 = 0.9 (HIGH)
    });
  });

  describe('Entry Validation', () => {
    it('returns READY for valid market conditions', () => {
      const legs = [
        {
          leg: { id: '1', type: 'call' as const, side: 'long' as const, strike: 100, quantity: 1, entryPrice: 0, multiplier: 100 },
          bid: 2.00, ask: 2.05
        }
      ];
      const res = validateEntry(legs, 100);
      assert.strictEqual(res.status, 'READY');
    });

    it('returns BLOCKED for stale quotes', () => {
      const legs = [
        {
          leg: { id: '1', type: 'call' as const, side: 'long' as const, strike: 100, quantity: 1, entryPrice: 0, multiplier: 100 },
          bid: 0, ask: 0
        }
      ];
      const res = validateEntry(legs, 100);
      assert.strictEqual(res.status, 'BLOCKED');
    });

    it('returns CAUTION for wide spreads', () => {
      const legs = [
        {
          leg: { id: '1', type: 'call' as const, side: 'long' as const, strike: 100, quantity: 1, entryPrice: 0, multiplier: 100 },
          bid: 1.00, ask: 2.00 // 50% spread
        }
      ];
      const res = validateEntry(legs, 100);
      assert.strictEqual(res.status, 'CAUTION');
    });
  });

  describe('Checklist & Plan Changes', () => {
    it('generates a valid checklist', () => {
      const plan: TradePlan = {
        id: '1', timestamp: 0, underlying: 'AAPL', strategyName: 'Long Call',
        legs: [], direction: 'bullish', thesis: 'Good earnings',
        entryCondition: 'Price > 100', targetPrice: 120, stopPrice: 90, expiration: '2025-01-01',
        maxPlannedLoss: 100, maxPlannedCapital: 100, quantity: 1,
        limitPrice: { bid: 100, ask: 100, midpoint: 100, theoretical: null, suggestedLimit: 100, acceptableRange: [100,100], debitOrCredit: 'DEBIT' },
        slippage: { estimatedSlippage: 0, liquidityPenalty: 0, totalExecutionCost: 0, breakEvenImpact: 0 },
        executionQuality: 'READY', executionReasons: [], checklist: [], educationalNote: ''
      };

      const checklist = generateChecklist(plan);
      assert.ok(checklist.find(c => c.category === 'MARKET' && c.status === 'PASS'));
      assert.ok(checklist.find(c => c.category === 'STRATEGY' && c.status === 'PASS'));
    });
  });
});
