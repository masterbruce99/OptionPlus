import { OptionContract } from '../providers/MarketDataProvider';
import { MarketEvent } from '../providers/EventDataProvider';
import { PortfolioPosition } from '../portfolio/types';

export type EventExpirationRelationship = 'BEFORE' | 'ON' | 'AFTER' | 'UNKNOWN';

export interface EventCoverage {
  relationship: EventExpirationRelationship;
  explanation: string;
}

/**
 * MODULE 10 & 11 - EXPIRATION RELATIONSHIP & EVENT-COVERAGE CHECK
 */
export function analyzeEventExpirationRelationship(event: MarketEvent, expiration: string): EventCoverage {
  if (!event.eventDate || event.status === 'DATE_UNKNOWN') {
    return {
      relationship: 'UNKNOWN',
      explanation: 'The event timing is unknown, making it impossible to determine if the option will capture the event.'
    };
  }

  // Normalize dates to comparable strings or numbers
  const eventDate = new Date(event.eventDate).getTime();
  const expDate = new Date(expiration).getTime();

  if (isNaN(eventDate) || isNaN(expDate)) {
    return {
      relationship: 'UNKNOWN',
      explanation: 'Invalid date formats prevent coverage analysis.'
    };
  }

  if (expDate < eventDate) {
    return {
      relationship: 'BEFORE',
      explanation: 'If the option expires before the event, the position may not remain open for the event itself.'
    };
  }

  if (expDate === eventDate) {
    return {
      relationship: 'ON',
      explanation: 'The event occurs on the expiration date. High risk of intraday volatility and assignment risk if held through the event.'
    };
  }

  return {
    relationship: 'AFTER',
    explanation: 'The option expires after the event, meaning the position remains exposed to the event.'
  };
}

/**
 * MODULE 9 - EVENT COUNTDOWN
 */
export function getDaysUntilEvent(event: MarketEvent): number | null {
  if (!event.eventDate) return null;
  const eventTime = new Date(event.eventDate).getTime();
  const now = new Date().getTime();
  const diffTime = eventTime - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * MODULE 24 & 17 - EVENT VS STRATEGY / RISK CONTEXT
 */
export function evaluateStrategyEventRisk(strategyName: string, eventCoverage: EventExpirationRelationship): string {
  if (eventCoverage === 'UNKNOWN') {
    return 'Event timing is unknown, so event-driven risk is unquantifiable.';
  }

  const isShortPremium = strategyName.toLowerCase().includes('short') || strategyName.toLowerCase().includes('credit') || strategyName.toLowerCase().includes('iron condor');

  if (eventCoverage === 'BEFORE') {
    return 'Event not captured. Trade thesis should rely on pre-event movement or IV run-up.';
  }

  if (isShortPremium) {
    return 'Event-related risk present. Short premium strategies may face outsized losses if the event gap exceeds expected ranges.';
  }

  return 'Event included. Trade thesis relies on the outcome of the event.';
}

/**
 * MODULE 25 & 26 - EVENT VS PORTFOLIO & CONCENTRATION
 */
export interface PortfolioEventExposure {
  event: MarketEvent;
  affectedPositions: PortfolioPosition[];
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
}

export function analyzePortfolioEventExposure(portfolio: PortfolioPosition[], events: MarketEvent[]): PortfolioEventExposure[] {
  return events.map(event => {
    // Find positions that expire AFTER or ON the event
    const affectedPositions = portfolio.filter(pos => {
      if (!pos.expiration) return false; // Stock legs don't have expiration
      const rel = analyzeEventExpirationRelationship(event, pos.expiration);
      return rel.relationship === 'AFTER' || rel.relationship === 'ON';
    });

    return {
      event,
      affectedPositions,
      totalDelta: affectedPositions.reduce((sum, pos) => sum + (pos.greeks?.delta || 0), 0),
      totalGamma: affectedPositions.reduce((sum, pos) => sum + (pos.greeks?.gamma || 0), 0),
      totalTheta: affectedPositions.reduce((sum, pos) => sum + (pos.greeks?.theta || 0), 0),
      totalVega: affectedPositions.reduce((sum, pos) => sum + (pos.greeks?.vega || 0), 0),
    };
  }).filter(exposure => exposure.affectedPositions.length > 0);
}

/**
 * MODULE 33 - EVENT CONFLICT DETECTION
 */
export function detectEventClusters(events: MarketEvent[], windowDays = 14): MarketEvent[][] {
  const sorted = [...events]
    .filter(e => e.eventDate)
    .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime());

  const clusters: MarketEvent[][] = [];
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  let currentCluster: MarketEvent[] = [];

  for (const event of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(event);
      continue;
    }

    const firstEventDate = new Date(currentCluster[0].eventDate!).getTime();
    const thisEventDate = new Date(event.eventDate!).getTime();

    if (thisEventDate - firstEventDate <= windowMs) {
      currentCluster.push(event);
    } else {
      if (currentCluster.length > 1) {
        clusters.push(currentCluster);
      }
      currentCluster = [event];
    }
  }

  if (currentCluster.length > 1) {
    clusters.push(currentCluster);
  }

  return clusters;
}

/**
 * MODULE 12 & 13 - EXPECTED MOVE AROUND EVENT (STRADDLE-IMPLIED)
 */
export interface EventExpectedMove {
  callPremium: number;
  putPremium: number;
  straddlePremium: number;
  methodology: string;
}

export function calculateStraddleImpliedMove(chain: OptionContract[], currentPrice: number): EventExpectedMove | null {
  if (chain.length === 0 || !currentPrice) return null;

  // Find ATM strike
  const atmStrike = chain.reduce((prev, curr) => 
    Math.abs(curr.strike - currentPrice) < Math.abs(prev.strike - currentPrice) ? curr : prev
  ).strike;

  const atmCall = chain.find(c => c.strike === atmStrike && c.type === 'call');
  const atmPut = chain.find(c => c.strike === atmStrike && c.type === 'put');

  if (!atmCall || !atmPut) return null;

  const callMid = ((atmCall.bid || 0) + (atmCall.ask || 0)) / 2;
  const putMid = ((atmPut.bid || 0) + (atmPut.ask || 0)) / 2;
  
  if (callMid === 0 || putMid === 0) return null;

  const straddlePremium = callMid + putMid;

  return {
    callPremium: callMid,
    putPremium: putMid,
    straddlePremium,
    methodology: 'ATM Straddle (Call Mid + Put Mid)'
  };
}
