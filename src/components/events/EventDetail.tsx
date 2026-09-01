import React from 'react';
import { MarketEvent } from '@/lib/providers/EventDataProvider';
import { educationalDictionary } from '@/lib/educationalEngine';

interface EventDetailProps {
  event: MarketEvent | null;
}

export const EventDetail: React.FC<EventDetailProps> = ({ event }) => {
  if (!event) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Select an event to view details.</p>
      </div>
    );
  }

  const educationalContext = [
    { term: 'Event Risk', definition: educationalDictionary['Event Risk']?.technical || 'Events can cause discontinuous price jumps.' },
    { term: 'IV Crush', definition: educationalDictionary['IV Crush']?.technical || 'Implied volatility often drops sharply after events.' },
    { term: 'Event-Expiration', definition: educationalDictionary['Event-Expiration Relationship']?.technical || 'Ensure options align with your desired exposure.' }
  ];

  return (
    <div className="space-y-6">
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{event.title}</h3>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: event.eventType === 'EARNINGS' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {event.eventType.toUpperCase()}
          </span>
        </div>
        
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '4px' }}>📅</div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Date</p>
                <p style={{ fontWeight: 'bold', margin: 0 }}>{event.eventDate || 'Unknown'}</p>
              </div>
            </div>
            {event.timing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '4px' }}>⏰</div>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Timing</p>
                  <p style={{ fontWeight: 'bold', margin: 0 }}>
                    {event.timing === 'BEFORE_OPEN' ? 'Before Open' : event.timing === 'AFTER_CLOSE' ? 'After Close' : 'During Hours'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {typeof event.metadata?.description === 'string' && (
            <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{event.metadata.description}</p>
            </div>
          )}

          {typeof event.metadata?.expectedMovePercentage === 'number' && (
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--accent-primary)' }}>📈</span>
                <h4 style={{ margin: 0, color: 'var(--accent-primary)' }}>Options Implied Move</h4>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>±{event.metadata.expectedMovePercentage.toFixed(2)}%</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                The market is pricing in a ±{event.metadata.expectedMovePercentage.toFixed(2)}% move by the nearest expiration. 
                This is derived from current at-the-money straddle prices.
              </p>
            </div>
          )}

          {event.metadata?.impact === 'high' && (
            <div style={{ background: 'var(--danger-color, #ef4444)22', borderLeft: '4px solid var(--danger-color, #ef4444)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--danger-color, #ef4444)' }}>⚠️</span>
                <h4 style={{ margin: 0, color: 'var(--danger-color, #ef4444)' }}>High Impact Expected</h4>
              </div>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>This event typically causes significant volatility in the underlying asset.</p>
            </div>
          )}
          
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📚</span> Educational Context & Risks
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {educationalContext.map((item, idx) => (
                <div key={idx} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-primary)' }}>{item.term}</h5>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.definition}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
