'use client';
import { AdvancedJournalEntry } from '../../lib/store';

export function TradeTimeline({ entry }: { entry: AdvancedJournalEntry }) {
  
  const timelineStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    borderLeft: '2px solid var(--border-color)',
    paddingLeft: '1.5rem',
    marginLeft: '1rem',
    position: 'relative'
  };

  const nodeStyle: React.CSSProperties = {
    position: 'relative'
  };

  const dotStyle: React.CSSProperties = {
    position: 'absolute',
    left: '-1.85rem',
    top: '0.25rem',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    border: '2px solid var(--bg-primary)'
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h4 style={{ marginBottom: '1rem' }}>Trade Lifecycle Timeline</h4>
      <div style={timelineStyle}>
        
        {/* Step 1: Idea / Thesis */}
        <div style={nodeStyle}>
          <div style={dotStyle} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.date} - Idea Generation</div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '4px', marginTop: '0.25rem' }}>
            <strong>Thesis:</strong> {entry.thesis}
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
              Direction: {entry.direction} | Volatility: {entry.volatilityView}
            </div>
          </div>
        </div>

        {/* Step 2: Entry */}
        <div style={nodeStyle}>
          <div style={dotStyle} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.date} - Trade Execution</div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '4px', marginTop: '0.25rem' }}>
            Executed {entry.contracts} {entry.strategy} on {entry.underlying} @ ${entry.entryPrice}
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
              Underlying Price: ${entry.marketEvidence.underlyingPriceAtEntry} | Risk: {entry.risk}
            </div>
            {/* Checklist */}
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              Checklist completed: {Object.values(entry.checklist).filter(Boolean).length} / {Object.keys(entry.checklist).length} rules followed.
            </div>
          </div>
        </div>

        {/* Step 3: Exit / Post-Mortem */}
        {entry.status === 'closed' && entry.postMortem ? (
          <div style={nodeStyle}>
            <div style={{ ...dotStyle, backgroundColor: entry.postMortem.realizedPL >= 0 ? 'var(--success)' : 'var(--danger)' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.postMortem.exitDate} - Exit & Post-Mortem</div>
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '4px', marginTop: '0.25rem' }}>
              Closed trade for a {entry.postMortem.realizedPL >= 0 ? 'profit' : 'loss'} of ${entry.postMortem.realizedPL.toFixed(2)}
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                Held for {entry.postMortem.daysHeld} days. Underlying ended at ${entry.postMortem.underlyingPriceAtExit}.
              </div>
            </div>
          </div>
        ) : (
          <div style={nodeStyle}>
            <div style={{ ...dotStyle, backgroundColor: 'transparent', border: '2px solid var(--text-muted)' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Trade Currently Open</div>
          </div>
        )}

      </div>
    </div>
  );
}
