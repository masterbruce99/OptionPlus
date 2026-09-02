import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  analyzeEventExpirationRelationship,
  getDaysUntilEvent,
  evaluateStrategyEventRisk,
  analyzePortfolioEventExposure,
  detectEventClusters,
  calculateStraddleImpliedMove,
  detectEventDateChange
} from './eventEngine';
import { MarketEvent } from '../providers/EventDataProvider';
import { PortfolioPosition } from '../portfolio/types';
import { OptionContract } from '../providers/MarketDataProvider';

describe('Phase 15: Event, Catalyst & Expiration Intelligence Engine', () => {
  const baseEvent: MarketEvent = {
    id: 'e1',
    symbol: 'AAPL',
    eventType: 'EARNINGS',
    title: 'Q1 Earnings',
    eventDate: '2026-10-15',
    eventTime: 'AFTER_CLOSE',
    timing: 'AFTER_CLOSE',
    timezone: 'America/New_York',
    source: 'test',
    status: 'UPCOMING',
    dataQuality: 'VERIFIED',
    retrievedAt: Date.now()
  };

  describe('Expiration Relationship (Module 10 & 11)', () => {
    it('detects option expiring before the event', () => {
      const result = analyzeEventExpirationRelationship(baseEvent, '2026-10-10');
      assert.strictEqual(result.relationship, 'BEFORE');
    });

    it('detects option expiring on the event date', () => {
      const result = analyzeEventExpirationRelationship(baseEvent, '2026-10-15');
      assert.strictEqual(result.relationship, 'ON');
    });

    it('detects option expiring after the event', () => {
      const result = analyzeEventExpirationRelationship(baseEvent, '2026-10-20');
      assert.strictEqual(result.relationship, 'AFTER');
    });

    it('gracefully returns UNKNOWN for missing event dates', () => {
      const unknownEvent = { ...baseEvent, eventDate: null };
      const result = analyzeEventExpirationRelationship(unknownEvent, '2026-10-20');
      assert.strictEqual(result.relationship, 'UNKNOWN');
    });

    it('gracefully returns UNKNOWN for invalid expirations', () => {
      const result = analyzeEventExpirationRelationship(baseEvent, 'invalid-date');
      assert.strictEqual(result.relationship, 'UNKNOWN');
    });
  });

  describe('Event Countdown (Module 9)', () => {
    it('returns null for missing event dates', () => {
      const days = getDaysUntilEvent({ ...baseEvent, eventDate: null });
      assert.strictEqual(days, null);
    });

    it('calculates days until event accurately', () => {
      // Future event date
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const futureEvent: MarketEvent = { ...baseEvent, eventDate: futureDate };
      const days = getDaysUntilEvent(futureEvent);
      assert.strictEqual(typeof days, 'number');
      assert.strictEqual(days! >= 9 && days! <= 11, true);
    });
  });

  describe('Strategy Risk Context (Modules 24 & 17)', () => {
    it('warns about short premium risk spanning an event', () => {
      const msg = evaluateStrategyEventRisk('Short Iron Condor', 'AFTER');
      assert.strictEqual(msg.includes('Event-related risk present'), true);
    });

    it('explains that BEFORE coverage does not capture event', () => {
      const msg = evaluateStrategyEventRisk('Long Call', 'BEFORE');
      assert.strictEqual(msg.includes('Event not captured'), true);
    });

    it('handles UNKNOWN coverage gracefully', () => {
      const msg = evaluateStrategyEventRisk('Long Call', 'UNKNOWN');
      assert.strictEqual(msg.includes('Event timing is unknown'), true);
    });
  });

  describe('Event Conflict Detection / Clustering (Module 33)', () => {
    it('detects events clustered within 14 days', () => {
      const e2: MarketEvent = { ...baseEvent, id: 'e2', eventType: 'DIVIDEND', eventDate: '2026-10-17' };
      const e3: MarketEvent = { ...baseEvent, id: 'e3', eventType: 'ECONOMIC', eventDate: '2026-11-20' };

      const clusters = detectEventClusters([baseEvent, e2, e3], 14);

      assert.strictEqual(clusters.length, 1);
      assert.strictEqual(clusters[0].length, 2);
      assert.strictEqual(clusters[0][0].id, 'e1');
      assert.strictEqual(clusters[0][1].id, 'e2');
    });
  });

  describe('Straddle Expected Move Integration (reusing Probability Engine)', () => {
    it('calculates expected move delegating to core probability formula', () => {
      const chain: OptionContract[] = [
        { symbol: 'AAPL_20261016_C_150', underlying: 'AAPL', expiration: '2026-10-16', strike: 150, type: 'call', bid: 5, ask: 5.2, last: 5, volume: 0, openInterest: 0, impliedVolatility: 0.3, greeks: {} },
        { symbol: 'AAPL_20261016_P_150', underlying: 'AAPL', expiration: '2026-10-16', strike: 150, type: 'put', bid: 4.8, ask: 5, last: 4.9, volume: 0, openInterest: 0, impliedVolatility: 0.3, greeks: {} }
      ];

      const move = calculateStraddleImpliedMove(chain, 150);

      assert.notStrictEqual(move, null);
      assert.strictEqual(move!.callPremium, 5.1); // (5 + 5.2) / 2
      assert.strictEqual(move!.putPremium, 4.9); // (4.8 + 5) / 2
      assert.strictEqual(move!.straddlePremium, 10); // 5.1 + 4.9
      assert.strictEqual(move!.methodology.includes('ATM Straddle'), true);
    });

    it('returns null for empty chain or missing quotes', () => {
      assert.strictEqual(calculateStraddleImpliedMove([], 150), null);
    });
  });

  describe('Portfolio Event Exposure (Module 25)', () => {
    it('groups portfolio exposure correctly based on event coverage', () => {
      const portfolio: PortfolioPosition[] = [
        {
          id: 'p1',
          underlying: 'AAPL',
          symbol: 'AAPL_20261020_C_150',
          type: 'call',
          strike: 150,
          expiration: '2026-10-20',
          contracts: 1,
          side: 'long',
          multiplier: 100,
          entryPrice: 5,
          currentBid: 6,
          currentAsk: 6.1,
          greeks: { delta: 0.5, gamma: 0.05, theta: -0.02, vega: 0.2, rho: 0 },
          timestamp: Date.now(),
          source: 'REAL_DATA',
          valuationMethod: 'MID'
        },
        {
          id: 'p2',
          underlying: 'AAPL',
          symbol: 'AAPL_20261010_P_150',
          type: 'put',
          strike: 150,
          expiration: '2026-10-10',
          contracts: 1,
          side: 'long',
          multiplier: 100,
          entryPrice: 2,
          currentBid: 1,
          currentAsk: 1.1,
          greeks: { delta: -0.4, gamma: 0.03, theta: -0.01, vega: 0.1, rho: 0 },
          timestamp: Date.now(),
          source: 'REAL_DATA',
          valuationMethod: 'MID'
        }
      ];

      const exposures = analyzePortfolioEventExposure(portfolio, [baseEvent]);

      // p1 expires 2026-10-20 (> 2026-10-15 event) -> AFTER
      // p2 expires 2026-10-10 (< 2026-10-15 event) -> BEFORE
      assert.strictEqual(exposures.length, 1);
      assert.strictEqual(exposures[0].affectedPositions.length, 1);
      assert.strictEqual(exposures[0].affectedPositions[0].id, 'p1');
      assert.strictEqual(exposures[0].totalDelta, 0.5);
      assert.strictEqual(exposures[0].totalVega, 0.2);
    });
  });

  describe('Event Date Change Detection (Module 34)', () => {
    it('returns UNCHANGED when date, time, and timezone match', () => {
      const prev = { id: 'e1', eventId: 'e1', symbol: 'AAPL', eventType: 'EARNINGS', eventDate: '2026-10-15', eventTime: 'AFTER_CLOSE', timezone: 'America/New_York' };
      const current = { ...baseEvent };

      const res = detectEventDateChange(prev, current);
      assert.strictEqual(res.status, 'UNCHANGED');
      assert.strictEqual(res.previousDate, '2026-10-15');
      assert.strictEqual(res.currentDate, '2026-10-15');
    });

    it('returns CHANGED when event date is updated', () => {
      const prev = { id: 'e1', eventId: 'e1', symbol: 'AAPL', eventType: 'EARNINGS', eventDate: '2026-10-15', eventTime: 'AFTER_CLOSE', timezone: 'America/New_York' };
      const current = { ...baseEvent, eventDate: '2026-10-22' };

      const res = detectEventDateChange(prev, current);
      assert.strictEqual(res.status, 'CHANGED');
      assert.strictEqual(res.previousDate, '2026-10-15');
      assert.strictEqual(res.currentDate, '2026-10-22');
      assert.strictEqual(res.explanation.includes('Date changed from 2026-10-15 to 2026-10-22'), true);
    });

    it('returns CHANGED when event time or timezone changes', () => {
      const prev = { id: 'e1', eventId: 'e1', symbol: 'AAPL', eventType: 'EARNINGS', eventDate: '2026-10-15', eventTime: 'BEFORE_OPEN', timezone: 'America/New_York' };
      const current = { ...baseEvent, eventTime: 'AFTER_CLOSE' };

      const res = detectEventDateChange(prev, current);
      assert.strictEqual(res.status, 'CHANGED');
      assert.strictEqual(res.previousTime, 'BEFORE_OPEN');
      assert.strictEqual(res.currentTime, 'AFTER_CLOSE');
    });

    it('returns UNKNOWN when previous event is missing or null', () => {
      const res = detectEventDateChange(null, baseEvent);
      assert.strictEqual(res.status, 'UNKNOWN');
      assert.strictEqual(res.explanation.includes('Missing previous or current'), true);
    });

    it('returns UNKNOWN when current event is missing or null', () => {
      const res = detectEventDateChange({ id: 'e1', eventDate: '2026-10-15' }, null);
      assert.strictEqual(res.status, 'UNKNOWN');
    });

    it('returns UNKNOWN for missing event dates', () => {
      const prev = { id: 'e1', eventId: 'e1', symbol: 'AAPL', eventType: 'EARNINGS', eventDate: null };
      const current = { ...baseEvent, eventDate: null };

      const res = detectEventDateChange(prev, current);
      assert.strictEqual(res.status, 'UNKNOWN');
    });

    it('returns UNKNOWN for non-matching event entities', () => {
      const prev = { id: 'e99', eventId: 'e99', symbol: 'MSFT', eventType: 'EARNINGS', eventDate: '2026-10-15' };
      const current = { ...baseEvent }; // AAPL e1

      const res = detectEventDateChange(prev, current);
      assert.strictEqual(res.status, 'UNKNOWN');
      assert.strictEqual(res.explanation.includes('different entities'), true);
    });
  });
});
