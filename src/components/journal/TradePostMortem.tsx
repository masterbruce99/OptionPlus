'use client';
import { useState } from 'react';
import { AdvancedJournalEntry, TradePostMortem, updateJournalEntry } from '../../lib/store';
import { generateDeterministicExplanation } from '../../lib/journalEngine';

export function TradePostMortemForm({ entry, onClosed }: { entry: AdvancedJournalEntry, onClosed: () => void }) {
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [exitPrice, setExitPrice] = useState(0);
  const [underlyingPriceAtExit, setUnderlyingPriceAtExit] = useState(0);
  const [realizedPL, setRealizedPL] = useState(0);
  
  const [expectedMove, setExpectedMove] = useState(0);
  const [actualMove, setActualMove] = useState(0);
  const [mistake, setMistake] = useState<TradePostMortem['mistakeClassification']>('NONE');
  const [review, setReview] = useState('');

  const handleClose = () => {
    const entryDate = new Date(entry.date);
    const closedDate = new Date(exitDate);
    const diffTime = Math.abs(closedDate.getTime() - entryDate.getTime());
    const daysHeld = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const postMortem: TradePostMortem = {
      exitDate,
      exitPrice,
      underlyingPriceAtExit,
      realizedPL,
      daysHeld,
      expectedVsActualMove: {
        expected: expectedMove,
        actual: actualMove
      },
      // These will be calculated properly by the engine in the display logic, but we must store placeholders or calculate here.
      // We will let the journalEngine handle this in display, so we store UNKNOWN here and overwrite.
      thesisAccuracy: 'WRONG', 
      primaryPLDriver: 'UNKNOWN',
      mistakeClassification: mistake,
      tradeReview: review
    };

    // We can pre-calculate the deterministic fields here or let the display do it. 
    // We will save it, then the engine will read it. To store correctly, we'll do a quick calculation.
    
    updateJournalEntry(entry.id, {
      status: 'closed',
      postMortem
    });

    onClosed();
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px', fontSize: '0.85rem', width: '100%',
    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
    border: '1px solid var(--border-color)', borderRadius: '4px'
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '6px', marginTop: '1rem' }}>
      <h4 style={{ margin: '0 0 1rem', color: 'var(--accent-primary)' }}>Post-Mortem & Review</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Exit Date</label><input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} style={inputStyle} /></div>
        <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Exit Price</label><input type="number" step="0.01" value={exitPrice} onChange={e => setExitPrice(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
        <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Realized P/L ($)</label><input type="number" step="0.01" value={realizedPL} onChange={e => setRealizedPL(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Underlying Price at Exit</label><input type="number" step="0.01" value={underlyingPriceAtExit} onChange={e => setUnderlyingPriceAtExit(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
        <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Move at Entry</label><input type="number" step="0.01" value={expectedMove} onChange={e => setExpectedMove(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
        <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actual Move</label><input type="number" step="0.01" value={actualMove} onChange={e => setActualMove(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mistake Classification (Be Honest)</label>
        <select value={mistake} onChange={e => setMistake(e.target.value as TradePostMortem['mistakeClassification'])} style={inputStyle}>
          <option value="NONE">None / Traded My Plan</option>
          <option value="FOMO">FOMO (Fear of Missing Out)</option>
          <option value="SIZING">Position Too Large</option>
          <option value="FORCED_TRADE">Forced a Trade / Overtrading</option>
          <option value="IGNORED_RULE">Ignored Pre-Trade Rules</option>
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trade Review / Lessons Learned</label>
        <textarea value={review} onChange={e => setReview(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What did you learn? What will you do differently?" />
      </div>

      <button onClick={handleClose} style={{
        padding: '10px 24px', fontWeight: 700, fontSize: '0.9rem',
        backgroundColor: 'var(--success)', color: '#fff',
        border: 'none', borderRadius: '4px', cursor: 'pointer'
      }}>
        Lock In Post-Mortem & Close Trade
      </button>
    </div>
  );
}

export function PostMortemDisplay({ entry }: { entry: AdvancedJournalEntry }) {
  if (!entry.postMortem) return null;
  const explanation = generateDeterministicExplanation(entry);
  
  return (
    <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '4px', borderLeft: '4px solid var(--accent-primary)' }}>
      <h5 style={{ margin: '0 0 0.5rem' }}>Post-Mortem Analysis</h5>
      <p style={{ fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
        {explanation}
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', fontSize: '0.8rem' }}>
        <div>
          <div className="text-muted" style={{ fontSize: '0.7rem' }}>Realized P/L</div>
          <strong style={{ color: entry.postMortem.realizedPL >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            ${entry.postMortem.realizedPL.toFixed(2)}
          </strong>
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: '0.7rem' }}>Days Held</div>
          <strong>{entry.postMortem.daysHeld}</strong>
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: '0.7rem' }}>Expected Move</div>
          <strong>{entry.postMortem.expectedVsActualMove.expected.toFixed(2)}</strong>
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: '0.7rem' }}>Actual Move</div>
          <strong>{entry.postMortem.expectedVsActualMove.actual.toFixed(2)}</strong>
        </div>
      </div>
      
      {entry.postMortem.tradeReview && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div className="text-muted" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>Your Review</div>
          <p style={{ fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>&quot;{entry.postMortem.tradeReview}&quot;</p>
        </div>
      )}
    </div>
  );
}
