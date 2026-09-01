import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { PortfolioPosition } from './types';
import { aggregatePortfolioGreeks, calculatePositionPnL, analyzeConcentration } from './engine';
import { analyzeAssignmentRisk, analyzeGreekExposure, calculateDeltaHedge } from './risk';

describe('Phase 8: Portfolio Risk & Position Intelligence', () => {
  const mockPos1: PortfolioPosition = {
    id: '1',
    underlying: 'AAPL',
    symbol: 'AAPL 2025-01-17 150C',
    type: 'call',
    strike: 150,
    expiration: '2025-01-17',
    contracts: 1,
    side: 'long',
    multiplier: 100,
    entryPrice: 5.00,
    currentBid: 5.50,
    currentAsk: 5.70,
    greeks: { delta: 0.5, gamma: 0.05, theta: -0.02, vega: 0.1, rho: 0.01 },
    timestamp: Date.now(),
    source: 'REAL_DATA',
    valuationMethod: 'MID'
  };

  const mockPos2: PortfolioPosition = {
    id: '2',
    underlying: 'AAPL',
    symbol: 'AAPL 2025-01-17 160C',
    type: 'call',
    strike: 160,
    expiration: '2025-01-17',
    contracts: 1,
    side: 'short',
    multiplier: 100,
    entryPrice: 2.00,
    currentBid: 1.50,
    currentAsk: 1.70,
    greeks: { delta: 0.3, gamma: 0.04, theta: -0.01, vega: 0.08, rho: 0.01 },
    timestamp: Date.now(),
    source: 'REAL_DATA',
    valuationMethod: 'MID'
  };

  describe('Module 1: Position Model & Valuation', () => {
    it('calculates P/L correctly for long options using MID', () => {
      // Entry = 5.00
      // Mid = (5.50 + 5.70) / 2 = 5.60
      // PnL = (5.60 - 5.00) * 1 * 100 = 60
      const pnl = calculatePositionPnL(mockPos1);
      assert.strictEqual(Math.abs(pnl - 60) < 0.001, true, `Expected 60, got ${pnl}`);
    });

    it('calculates P/L correctly for short options using MID', () => {
      // Entry = 2.00
      // Mid = (1.50 + 1.70) / 2 = 1.60
      // PnL = (1.60 - 2.00) * -1 * 100 = 40
      const pnl = calculatePositionPnL(mockPos2);
      assert.strictEqual(Math.abs(pnl - 40) < 0.001, true, `Expected 40, got ${pnl}`);
    });
  });

  describe('Module 4: Portfolio Greeks', () => {
    it('aggregates portfolio Greeks taking long/short and multipliers into account', () => {
      const greeks = aggregatePortfolioGreeks([mockPos1, mockPos2]);
      
      // Pos 1 delta = 0.5 * 100 * 1 = 50
      // Pos 2 delta = 0.3 * 100 * -1 = -30
      // Net = 20
      assert.strictEqual(greeks.netDelta, 20);

      // Pos 1 gamma = 0.05 * 100 = 5
      // Pos 2 gamma = 0.04 * -100 = -4
      // Net = 1
      assert.strictEqual(Math.abs(greeks.netGamma - 1) < 0.001, true);
    });

    it('dollar sensitivities map correctly', () => {
      const greeks = aggregatePortfolioGreeks([mockPos1, mockPos2]);
      assert.strictEqual(greeks.dollarDelta, greeks.netDelta); // Using netDelta as equivalent shares
    });
  });

  describe('Module 6-8: Concentration', () => {
    it('groups exposure by underlying and expiration', () => {
      const report = analyzeConcentration([mockPos1, mockPos2]);
      assert.strictEqual(report.underlying['AAPL'].positions, 2);
      assert.strictEqual(report.expiration['2025-01-17'].positions, 2);
      assert.strictEqual(report.underlying['AAPL'].delta, 20);
    });
  });

  describe('Module 10: Assignment Risk', () => {
    it('flags short options for assignment risk', () => {
      const warnings = analyzeAssignmentRisk([mockPos1, mockPos2]);
      assert.strictEqual(warnings.length, 1);
      assert.strictEqual(warnings[0].affectedPositions?.includes('2'), true);
      assert.strictEqual(warnings[0].affectedPositions?.includes('1'), false);
    });
  });

  describe('Module 19: Hedging Analysis', () => {
    it('calculates the correct offsetting hedge quantity', () => {
      // If portfolio delta is +20, hedge needs to be -20 shares
      const hedge = calculateDeltaHedge(20);
      assert.strictEqual(hedge, -20);
    });
  });
});
