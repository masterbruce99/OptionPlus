import {
  analyzeEventExpirationRelationship,
  getDaysUntilEvent,
  evaluateStrategyEventRisk,
  analyzePortfolioEventExposure,
  detectEventClusters,
  calculateStraddleImpliedMove
} from './eventEngine';
import { MarketEvent } from '../providers/EventDataProvider';
import { PortfolioPosition } from '../portfolioEngine';
import { OptionContract } from '../providers/MarketDataProvider';

describe('Event Engine (Phase 15)', () => {
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

  describe('Expiration Relationship (Module 10)', () => {
    it('detects option expiring before the event', () => {
      const result = analyzeEventExpirationRelationship(baseEvent, '2026-10-10');
      expect(result.relationship).toBe('BEFORE');
    });

    it('detects option expiring on the event date', () => {
      const result = analyzeEventExpirationRelationship(baseEvent, '2026-10-15');
      expect(result.relationship).toBe('ON');
    });

    it('detects option expiring after the event', () => {
      const result = analyzeEventExpirationRelationship(baseEvent, '2026-10-20');
      expect(result.relationship).toBe('AFTER');
    });

    it('gracefully returns UNKNOWN for missing event dates', () => {
      const unknownEvent = { ...baseEvent, eventDate: null };
      const result = analyzeEventExpirationRelationship(unknownEvent, '2026-10-20');
      expect(result.relationship).toBe('UNKNOWN');
    });

    it('gracefully returns UNKNOWN for invalid expirations', () => {
      const result = analyzeEventExpirationRelationship(baseEvent, 'invalid-date');
      expect(result.relationship).toBe('UNKNOWN');
    });
  });

  describe('Event Countdown (Module 9)', () => {
    it('calculates days until event correctly', () => {
      // Mock Date.now() to a fixed date
      jest.useFakeTimers().setSystemTime(new Date('2026-10-01').getTime());
      
      const days = getDaysUntilEvent(baseEvent);
      expect(days).toBe(14); // 15 - 1
      
      jest.useRealTimers();
    });

    it('returns null for missing event dates', () => {
      const days = getDaysUntilEvent({ ...baseEvent, eventDate: null });
      expect(days).toBeNull();
    });
  });

  describe('Strategy Risk Context (Modules 24, 17)', () => {
    it('warns about short premium risk spanning an event', () => {
      const msg = evaluateStrategyEventRisk('Short Iron Condor', 'AFTER');
      expect(msg).toContain('Event-related risk present');
    });

    it('explains that BEFORE coverage does not capture event', () => {
      const msg = evaluateStrategyEventRisk('Long Call', 'BEFORE');
      expect(msg).toContain('Event not captured');
    });
  });

  describe('Event Conflict Detection (Module 33)', () => {
    it('detects events clustered within 14 days', () => {
      const e2: MarketEvent = { ...baseEvent, id: 'e2', eventType: 'DIVIDEND', eventDate: '2026-10-17' };
      const e3: MarketEvent = { ...baseEvent, id: 'e3', eventType: 'ECONOMIC', eventDate: '2026-11-20' };
      
      const clusters = detectEventClusters([baseEvent, e2, e3], 14);
      
      expect(clusters.length).toBe(1); // One cluster found
      expect(clusters[0].length).toBe(2); // Containing the first two events
      expect(clusters[0][0].id).toBe('e1');
      expect(clusters[0][1].id).toBe('e2');
    });
  });

  describe('Straddle Implied Move (Modules 12, 13)', () => {
    it('calculates expected move from ATM straddle', () => {
      const chain: OptionContract[] = [
        { symbol: 'AAPL_20261016_C_150', underlying: 'AAPL', expiration: '2026-10-16', strike: 150, type: 'call', bid: 5, ask: 5.2, last: 5, volume: 0, openInterest: 0, impliedVolatility: 0.3, greeks: {} },
        { symbol: 'AAPL_20261016_P_150', underlying: 'AAPL', expiration: '2026-10-16', strike: 150, type: 'put', bid: 4.8, ask: 5, last: 4.9, volume: 0, openInterest: 0, impliedVolatility: 0.3, greeks: {} }
      ];

      const move = calculateStraddleImpliedMove(chain, 150.5); // ATM is 150
      
      expect(move).not.toBeNull();
      expect(move!.callPremium).toBe(5.1); // (5 + 5.2)/2
      expect(move!.putPremium).toBe(4.9); // (4.8 + 5)/2
      expect(move!.straddlePremium).toBe(10); // 5.1 + 4.9
      expect(move!.methodology).toContain('ATM Straddle');
    });
  });

  describe('Portfolio Event Exposure (Module 25)', () => {
    it('groups portfolio exposure correctly', () => {
      const portfolio: PortfolioPosition[] = [
        {
          id: 'p1',
          symbol: 'AAPL',
          contracts: 1, // long
          entryPrice: 5,
          currentPrice: 6,
          option: { symbol: 'AAPL_20261020_C_150', underlying: 'AAPL', expiration: '2026-10-20', strike: 150, type: 'call', bid: 6, ask: 6.1, last: 6, volume: 0, openInterest: 0, impliedVolatility: 0.3, greeks: { delta: 0.5, vega: 0.2 } },
          greeks: { delta: 50, gamma: 0, theta: 0, vega: 20 },
          pl: 100,
          plPercent: 20
        },
        {
          id: 'p2',
          symbol: 'AAPL',
          contracts: 1, // long
          entryPrice: 2,
          currentPrice: 1,
          option: { symbol: 'AAPL_20261010_P_150', underlying: 'AAPL', expiration: '2026-10-10', strike: 150, type: 'put', bid: 1, ask: 1.1, last: 1, volume: 0, openInterest: 0, impliedVolatility: 0.3, greeks: { delta: -0.4, vega: 0.1 } },
          greeks: { delta: -40, gamma: 0, theta: 0, vega: 10 },
          pl: -100,
          plPercent: -50
        }
      ];

      const exposures = analyzePortfolioEventExposure(portfolio, [baseEvent]);
      
      // Expected: p1 spans the event (2026-10-20 > 2026-10-15). p2 expires before the event (2026-10-10).
      expect(exposures.length).toBe(1);
      expect(exposures[0].affectedPositions.length).toBe(1);
      expect(exposures[0].affectedPositions[0].id).toBe('p1');
      expect(exposures[0].totalDelta).toBe(50);
      expect(exposures[0].totalVega).toBe(20);
    });
  });
});
