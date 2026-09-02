import { OptionContract } from '../providers/MarketDataProvider';
import { MarketEvent } from '../providers/EventDataProvider';
import { PortfolioPosition } from '../portfolio/types';
import { calculateStraddleExpectedMove } from '../probability/expectedMove';

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
 * Thin adapter reusing the core probability engine's calculateStraddleExpectedMove formula.
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

  const callPrice = ((atmCall.bid || 0) + (atmCall.ask || 0)) / 2 || atmCall.ask || 0;
  const putPrice = ((atmPut.bid || 0) + (atmPut.ask || 0)) / 2 || atmPut.ask || 0;
  
  if (callPrice <= 0 || putPrice <= 0) return null;

  // Delegate straddle expected move calculation to core probability engine
  const moveResult = calculateStraddleExpectedMove(currentPrice, callPrice, putPrice);
  if (moveResult.status === 'INSUFFICIENT DATA') return null;

  return {
    callPremium: callPrice,
    putPremium: putPrice,
    straddlePremium: moveResult.value,
    methodology: `ATM Straddle (${moveResult.methodology})`
  };
}

/**
 * MODULE 34 - EVENT CHANGE DETECTION
 * Compares previous event/snapshot with current event to detect date, time, or timezone changes.
 */
export type EventChangeStatus = 'UNCHANGED' | 'CHANGED' | 'UNKNOWN';

export interface EventChangeResult {
  status: EventChangeStatus;
  explanation: string;
  previousDate?: string | null;
  currentDate?: string | null;
  previousTime?: string | null;
  currentTime?: string | null;
  previousTimezone?: string | null;
  currentTimezone?: string | null;
}

export function detectEventDateChange(
  previous: { id?: string; eventId?: string; symbol?: string; eventType?: string; eventDate?: string | null; eventTime?: string | null; timezone?: string } | null | undefined,
  current: MarketEvent | null | undefined
): EventChangeResult {
  if (!previous || !current) {
    return {
      status: 'UNKNOWN',
      explanation: 'Missing previous or current event data for comparison.'
    };
  }

  // Verify event identity match (ID or symbol + eventType)
  const prevId = previous.eventId || previous.id;
  const currId = current.id;
  const isSameId = prevId && currId && prevId === currId;
  const isSameSymbolType = previous.symbol === current.symbol && previous.eventType === current.eventType;

  if (!isSameId && !isSameSymbolType) {
    return {
      status: 'UNKNOWN',
      explanation: 'Previous and current events refer to different entities.'
    };
  }

  const prevDate = previous.eventDate ?? null;
  const currDate = current.eventDate ?? null;
  const prevTime = previous.eventTime ?? null;
  const currTime = current.eventTime ?? null;
  const prevTz = previous.timezone ?? null;
  const currTz = current.timezone ?? null;

  if (!prevDate || !currDate) {
    return {
      status: 'UNKNOWN',
      explanation: 'One or both events lack a valid date for change detection.',
      previousDate: prevDate,
      currentDate: currDate
    };
  }

  const dateChanged = prevDate !== currDate;
  const timeChanged = prevTime !== null && currTime !== null && prevTime !== currTime;
  const tzChanged = prevTz !== null && currTz !== null && prevTz !== currTz;

  if (dateChanged || timeChanged || tzChanged) {
    const changes: string[] = [];
    if (dateChanged) changes.push(`Date changed from ${prevDate} to ${currDate}`);
    if (timeChanged) changes.push(`Time changed from ${prevTime} to ${currTime}`);
    if (tzChanged) changes.push(`Timezone changed from ${prevTz} to ${currTz}`);

    return {
      status: 'CHANGED',
      explanation: changes.join('; '),
      previousDate: prevDate,
      currentDate: currDate,
      previousTime: prevTime,
      currentTime: currTime,
      previousTimezone: prevTz,
      currentTimezone: currTz
    };
  }

  return {
    status: 'UNCHANGED',
    explanation: 'Event date, time, and timezone remain unchanged.',
    previousDate: prevDate,
    currentDate: currDate,
    previousTime: prevTime,
    currentTime: currTime,
    previousTimezone: prevTz,
    currentTimezone: currTz
  };
}
