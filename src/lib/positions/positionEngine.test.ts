import test from 'node:test';
import assert from 'node:assert';
import { calculateRealTimePnL, evaluateLifecycleState, evaluateAdjustments, closePosition } from './positionEngine';
import { LivePosition, LegFill } from './types';
import { TradePlan } from '../execution/types';

test('Position Engine - calculateRealTimePnL', () => {
  const plan: TradePlan = {
    id: 'plan-1',
    timestamp: Date.now(),
    underlying: 'AAPL',
    strategyName: 'Long Call',
    legs: [
      { id: 'leg-1', type: 'call', side: 'long', strike: 150, quantity: 1, entryPrice: 5.0, multiplier: 100 }
    ],
    direction: 'bullish',
    thesis: 'Test',
    entryCondition: '',
    targetPrice: null,
    stopPrice: null,
    expiration: '2025-01-17',
    maxPlannedLoss: 500,
    maxPlannedCapital: 500,
    quantity: 1,
    limitPrice: { bid: 4.9, ask: 5.1, midpoint: 5.0, theoretical: 5.0, suggestedLimit: 5.0, acceptableRange: [4.9, 5.1], debitOrCredit: 'DEBIT' },
    slippage: { estimatedSlippage: 0, liquidityPenalty: 0, totalExecutionCost: 0, breakEvenImpact: 0 },
    executionQuality: 'READY',
    executionReasons: [],
    checklist: [],
    educationalNote: ''
  };

  const pos: LivePosition = {
    id: 'pos-1',
    planId: 'plan-1',
    underlying: 'AAPL',
    status: 'OPEN',
    plan,
    fills: [{ legId: 'leg-1', fillPrice: 5.0, quantity: 1, filledAt: Date.now() }],
    enteredAt: Date.now(),
    closedAt: null,
    currentPnL: { unrealizedPnL: null, realizedPnL: null, returnOnCapital: null, marginUtilization: null },
    currentGreeks: null,
    adjustmentRecommendation: null,
    upcomingEvents: []
  };

  // Option price increases to $7.00
  const quote = { symbol: 'AAPL', price: 155, change: 5, changePercentage: 3.3, volume: 10000 };
  const chain = [
    { symbol: 'AAPL250117C00150000', underlying: 'AAPL', expiration: '2025-01-17', strike: 150, type: 'call' as const, bid: 6.9, ask: 7.1, last: 7.0, volume: 10, openInterest: 100, impliedVolatility: 0.3, greeks: {} }
  ];

  const pnl = calculateRealTimePnL(pos, quote, chain);
  
  assert.strictEqual(pnl.unrealizedPnL, 200, "Unrealized PnL should be (7 - 5) * 100 = 200");
  assert.strictEqual(pnl.marginUtilization, 500, "Capital tied up is 500");
  assert.strictEqual(pnl.returnOnCapital, 40, "ROC should be 40%");
});

test('Position Engine - evaluateLifecycleState', () => {
  const pos: any = {
    status: 'OPEN',
    plan: { maxPlannedLoss: 100 },
    currentPnL: { unrealizedPnL: -150 }, // breached max loss
    adjustmentRecommendation: null
  };
  
  const state = evaluateLifecycleState(pos as LivePosition);
  assert.strictEqual(state, 'EXIT_READY', "Should be EXIT_READY when max loss breached");
});

test('Position Engine - evaluateAdjustments', () => {
  const plan: any = {
    legs: [
      { id: 'leg-1', side: 'short', type: 'put', strike: 100, multiplier: 100 }
    ],
    maxPlannedLoss: 500
  };
  const pos: any = {
    status: 'OPEN',
    plan,
    currentPnL: { unrealizedPnL: -50, returnOnCapital: -10 }
  };

  const quote = { symbol: 'XYZ', price: 101, change: 0, changePercentage: 0, volume: 100 }; // Price is 101, short put is 100. 101-100 = 1 / 101 < 0.02

  const adj = evaluateAdjustments(pos as LivePosition, quote);
  assert.ok(adj !== null);
  assert.strictEqual(adj!.type, 'ROLL_FORWARD');
});

test('Position Engine - closePosition', () => {
  const plan: any = {
    id: 'plan-xyz', // matches journal
    legs: [
      { id: 'leg-1', type: 'call', side: 'long', multiplier: 100 }
    ]
  };
  
  const pos: any = {
    status: 'OPEN',
    plan,
    fills: [
      { legId: 'leg-1', fillPrice: 5.0, quantity: 1 }
    ],
    currentPnL: { unrealizedPnL: 200, realizedPnL: null },
    enteredAt: Date.now() - 86400000 // 1 day ago
  };

  const exitFills: LegFill[] = [
    { legId: 'leg-1', fillPrice: 7.0, quantity: 1, filledAt: Date.now() }
  ];

  const currentQuote = { symbol: 'AAPL', price: 155, change: 0, changePercentage: 0, volume: 0 };

  const closed = closePosition(pos, exitFills, currentQuote, "Good trade", "NONE");
  
  assert.strictEqual(closed.status, 'CLOSED');
  assert.strictEqual(closed.currentPnL.unrealizedPnL, 0);
  assert.strictEqual(closed.currentPnL.realizedPnL, 200);
});
