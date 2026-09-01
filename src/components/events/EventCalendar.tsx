import React from 'react';
import { MarketEvent } from '@/lib/providers/EventDataProvider';

interface EventCalendarProps {
  events: MarketEvent[];
  selectedEventId?: string;
  onSelectEvent: (eventId: string) => void;
}

export const EventCalendar: React.FC<EventCalendarProps> = ({ events, selectedEventId, onSelectEvent }) => {
  // Simple list view for now, could be expanded to a full calendar grid if needed
  
  if (events.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>No upcoming events found.</p>
      </div>
    );
  }

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
    const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
    return dateA - dateB;
  });

  const groupedEvents: Record<string, MarketEvent[]> = {};
  sortedEvents.forEach(event => {
    const dateKey = (event.eventDate || 'Unknown Date').split('T')[0];
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <div className="space-y-6">
      {sortedDates.map(date => {
        const d = new Date(date);
        return (
        <div key={date} style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {groupedEvents[date].map(event => (
              <div 
                key={event.id}
                className="card"
                style={{ 
                  cursor: 'pointer', 
                  border: selectedEventId === event.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  padding: '1rem'
                }}
                onClick={() => onSelectEvent(event.id)}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 'bold' }}>{event.symbol}</span>
                    <span style={{ padding: '2px 6px', fontSize: '0.75rem', borderRadius: '4px', background: event.eventType === 'EARNINGS' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: '#fff' }}>
                      {event.eventType.toUpperCase()}
                    </span>
                    {event.metadata?.impact === 'high' && (
                      <span style={{ padding: '2px 6px', fontSize: '0.75rem', borderRadius: '4px', background: 'var(--danger-color, #ef4444)', color: '#fff' }}>
                        HIGH IMPACT
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.9rem', margin: 0 }}>{event.title}</p>
                  {event.timing && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                      {event.timing === 'BEFORE_OPEN' ? 'Before Market Open' : event.timing === 'AFTER_CLOSE' ? 'After Market Close' : 'During Market Hours'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )})}
    </div>
  );
};
