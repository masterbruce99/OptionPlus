'use client';
import { useMemo } from 'react';
import { AdvancedJournalEntry } from '../../lib/store';
import { calculateWinRate, calculateWinRateByStrategy, calculateEV } from '../../lib/journalEngine';

export function PerformanceAnalytics({ entries }: { entries: AdvancedJournalEntry[] }) {
  const closedEntries = useMemo(() => entries.filter(e => e.status === 'closed' && e.postMortem), [entries]);

  const winRate = useMemo(() => calculateWinRate(closedEntries), [closedEntries]);
  const winRateByStrategy = useMemo(() => calculateWinRateByStrategy(closedEntries), [closedEntries]);
  const expectedValue = useMemo(() => calculateEV(closedEntries), [closedEntries]);
  
  const totalPL = useMemo(() => closedEntries.reduce((sum, e) => sum + (e.postMortem?.realizedPL || 0), 0), [closedEntries]);
  const averageDaysHeld = useMemo(() => {
    if (closedEntries.length === 0) return 0;
    return closedEntries.reduce((sum, e) => sum + (e.postMortem?.daysHeld || 0), 0) / closedEntries.length;
  }, [closedEntries]);

  // Pattern Tracking: Mistake Frequencies
  const mistakeFrequencies = useMemo(() => {
    const freqs: Record<string, number> = {};
    closedEntries.forEach(e => {
      const mistake = e.postMortem?.mistakeClassification || 'NONE';
      freqs[mistake] = (freqs[mistake] || 0) + 1;
    });
    return freqs;
  }, [closedEntries]);

  // Thesis Accuracy
  const accuracyStats = useMemo(() => {
    let correct = 0;
    let partial = 0;
    let wrong = 0;
    closedEntries.forEach(e => {
      const acc = e.postMortem?.thesisAccuracy;
      if (acc === 'CORRECT') correct++;
      if (acc === 'PARTIALLY_CORRECT') partial++;
      if (acc === 'WRONG') wrong++;
    });
    return { correct, partial, wrong };
  }, [closedEntries]);

  if (closedEntries.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No closed trades available for analytics. Complete a trade to see insights.</div>;
  }

  const statCardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    padding: '1.25rem',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  };

  return (
    <div>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>Performance & Analytics</h3>
      
      {/* Top Level KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={statCardStyle}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total P/L</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: totalPL >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            ${totalPL.toFixed(2)}
          </span>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Win Rate</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {winRate.toFixed(1)}%
          </span>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Expected Value (per trade)</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: expectedValue >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            ${expectedValue.toFixed(2)}
          </span>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Avg Days Held</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {averageDaysHeld.toFixed(1)} days
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Thesis Accuracy */}
        <div>
          <h4 style={{ marginBottom: '1rem' }}>Thesis Accuracy</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Correct Direction</span>
              <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{accuracyStats.correct}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Right Outcome, Wrong Reason</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{accuracyStats.partial}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Wrong Direction</span>
              <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{accuracyStats.wrong}</span>
            </div>
          </div>
        </div>

        {/* Mistake Pattern Tracking */}
        <div>
          <h4 style={{ marginBottom: '1rem' }}>Pattern Tracking (Mistakes)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
            {Object.keys(mistakeFrequencies).length === 0 ? (
              <span className="text-muted">No mistake patterns detected.</span>
            ) : (
              Object.entries(mistakeFrequencies).sort((a,b) => b[1] - a[1]).map(([mistake, count]) => (
                <div key={mistake} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{mistake.replace(/_/g, ' ')}</span>
                  <span style={{ fontWeight: 'bold' }}>{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Strategy Performance */}
        <div style={{ gridColumn: '1 / -1' }}>
          <h4 style={{ marginBottom: '1rem' }}>Performance by Strategy</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Strategy</th>
                <th style={{ padding: '0.5rem' }}>Trades</th>
                <th style={{ padding: '0.5rem' }}>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(winRateByStrategy).map(([strategy, stats]) => (
                <tr key={strategy} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.5rem' }}>{strategy}</td>
                  <td style={{ padding: '0.5rem' }}>{stats.count}</td>
                  <td style={{ padding: '0.5rem', color: stats.winRate >= 50 ? 'var(--success)' : 'var(--danger)' }}>
                    {stats.winRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
