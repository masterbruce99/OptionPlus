export type EventCategory = 'EARNINGS' | 'DIVIDEND' | 'ECONOMIC' | 'CORPORATE' | 'REGULATORY' | 'OTHER';

export type EventStatus = 'UPCOMING' | 'TODAY' | 'PASSED' | 'DATE_UNKNOWN';

export type EventTiming = 'BEFORE_OPEN' | 'AFTER_CLOSE' | 'DURING_SESSION' | 'UNKNOWN';

export type EventDataQuality = 'VERIFIED' | 'ESTIMATED' | 'UNAVAILABLE' | 'PARTIAL';

export interface MarketEvent {
  id: string;
  symbol: string | 'MACRO'; // Use 'MACRO' for economic events
  eventType: EventCategory;
  title: string;
  eventDate: string | null; // YYYY-MM-DD
  eventTime: string | null; // HH:MM:SS or string representation
  timing: EventTiming;
  timezone: string;
  source: string;
  sourceUrl?: string;
  status: EventStatus;
  dataQuality: EventDataQuality;
  retrievedAt: number;
  metadata?: Record<string, unknown>;
}

export interface EventProviderCapabilities {
  earnings: EventDataQuality;
  dividends: EventDataQuality;
  economic: EventDataQuality;
  corporate: EventDataQuality;
}

export interface EventDataProvider {
  getCapabilities(): EventProviderCapabilities;
  getEventsForSymbol(symbol: string): Promise<MarketEvent[]>;
  getMacroEvents(): Promise<MarketEvent[]>;
}

/**
 * DefaultEventProvider
 * 
 * Returns UNAVAILABLE for all capabilities per data-integrity rules unless
 * a verified external event source is integrated.
 */
export class DefaultEventProvider implements EventDataProvider {
  getCapabilities(): EventProviderCapabilities {
    return {
      earnings: 'UNAVAILABLE',
      dividends: 'UNAVAILABLE',
      economic: 'UNAVAILABLE',
      corporate: 'UNAVAILABLE'
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getEventsForSymbol(symbol: string): Promise<MarketEvent[]> {
    return []; // EVENT DATA UNAVAILABLE
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUpcomingEvents(symbol: string, startDate?: string, endDate?: string): Promise<MarketEvent[]> {
    return []; // EVENT DATA UNAVAILABLE
  }

  async getMacroEvents(): Promise<MarketEvent[]> {
    return []; // EVENT DATA UNAVAILABLE
  }
}
