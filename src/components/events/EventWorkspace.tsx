import React, { useState } from 'react';
import { EventScanner } from './EventScanner';
import { EventCalendar } from './EventCalendar';
import { EventDetail } from './EventDetail';
import { MarketEvent } from '@/lib/providers/EventDataProvider';
import { DefaultEventProvider } from '@/lib/providers/EventDataProvider';

export const EventWorkspace: React.FC = () => {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = new DefaultEventProvider();

  const handleSearch = async (symbol: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedEventId(undefined);
    try {
      // For now, DefaultEventProvider returns empty or unavailable logic
      const fetchedEvents = await provider.getUpcomingEvents(symbol);
      setEvents(fetchedEvents);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch events.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Event Intelligence</h2>
      </div>

      <EventScanner onSearch={handleSearch} isLoading={isLoading} />

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #ef4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span>⚠️</span>
            <h4 style={{ margin: 0, color: '#991b1b' }}>Error</h4>
          </div>
          <p style={{ margin: 0, color: '#991b1b' }}>{error}</p>
        </div>
      )}

      {!error && events.length === 0 && !isLoading && (
        <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '4px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Search for a symbol to find upcoming events. Note: Event data requires a configured API provider.
          </p>
        </div>
      )}

      {events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 border-r pr-6 h-[calc(100vh-300px)] overflow-y-auto">
            <EventCalendar 
              events={events} 
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId} 
            />
          </div>
          <div className="md:col-span-2 pl-6">
            {selectedEvent ? (
              <EventDetail event={selectedEvent} />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>Select an event from the calendar to view details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
