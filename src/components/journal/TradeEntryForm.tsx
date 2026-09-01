'use client';
import { useState } from 'react';
import { 
  addJournalEntry, 
  MarketViewDirection, 
  VolatilityView, 
  PreTradeChecklist,
  MarketEvidence
} from '../../lib/store';

export function TradeEntryForm({ onSaved }: { onSaved: () => void }) {
  // Module 1 & 10: Trade Idea / Entry Record
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [underlying, setUnderlying] = useState('');
  const [strategy, setStrategy] = useState('');
  const [contracts, setContracts] = useState(1);
  const [entryPrice, setEntryPrice] = useState(0);
  const [risk, setRisk] = useState('');
  
  // Module 2: Thesis
  const [direction, setDirection] = useState<MarketViewDirection>('bullish');
  const [volatilityView, setVolatilityView] = useState<VolatilityView>('neutral');
  const [thesis, setThesis] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  
  // Module 3: Market Evidence
  const [underlyingPriceAtEntry, setUnderlyingPriceAtEntry] = useState(0);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  
  // Modules 6-9: Pre-Trade Checklist & Rules
  const [whatMustHappen, setWhatMustHappen] = useState('');
  const [whatCanGoWrong, setWhatCanGoWrong] = useState('');
  const [invalidationRule, setInvalidationRule] = useState('');
  const [checklist, setChecklist] = useState<PreTradeChecklist>({
    thesisMatchesMarket: false,
    riskDefined: false,
    capitalEfficient: false,
    liquidityChecked: false,
    earningsChecked: false
  });

  const handleSubmit = () => {
    if (!underlying || !strategy || !thesis) {
      alert("Please fill out the underlying, strategy, and thesis.");
      return;
    }

    const marketEvidence: MarketEvidence = {
      underlyingPriceAtEntry,
      notes: evidenceNotes
    };

    addJournalEntry({
      date,
      underlying: underlying.toUpperCase(),
      strategy,
      direction,
      volatilityView,
      thesis,
      expectedOutcome,
      marketEvidence,
      checklist,
      whatMustHappen,
      whatCanGoWrong,
      invalidationRule,
      contracts,
      entryPrice,
      legs: [],
      risk,
      status: 'open'
    });
    onSaved();
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px', fontSize: '0.85rem', width: '100%',
    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
    border: '1px solid var(--border-color)', borderRadius: '4px'
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      
      {/* Column 1: Trade Basics & Thesis */}
      <div>
        <h4 style={{ margin: '0 0 1rem' }}>1. The Idea & Entry</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} /></div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Symbol</label><input value={underlying} onChange={e => setUnderlying(e.target.value)} placeholder="AAPL" style={inputStyle} /></div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Strategy</label><input value={strategy} onChange={e => setStrategy(e.target.value)} placeholder="Long Call" style={inputStyle} /></div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direction</label>
            <select value={direction} onChange={e => setDirection(e.target.value as MarketViewDirection)} style={inputStyle}>
              <option value="bullish">Bullish</option><option value="bearish">Bearish</option><option value="neutral">Neutral</option>
            </select>
          </div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Volatility View</label>
            <select value={volatilityView} onChange={e => setVolatilityView(e.target.value as VolatilityView)} style={inputStyle}>
              <option value="neutral">Neutral</option><option value="increasing">Increasing</option><option value="decreasing">Decreasing</option>
            </select>
          </div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Underlying Price</label><input type="number" step="0.01" value={underlyingPriceAtEntry} onChange={e => setUnderlyingPriceAtEntry(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contracts</label><input type="number" min={1} value={contracts} onChange={e => setContracts(parseInt(e.target.value) || 1)} style={inputStyle} /></div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entry Price</label><input type="number" step="0.01" value={entryPrice} onChange={e => setEntryPrice(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
        </div>

        <h4 style={{ margin: '0 0 1rem' }}>2. The Thesis</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>What do I believe?</label><textarea value={thesis} onChange={e => setThesis(e.target.value)} rows={3} style={{...inputStyle, resize: 'vertical'}} placeholder="My market view is..." /></div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Market Evidence</label><textarea value={evidenceNotes} onChange={e => setEvidenceNotes(e.target.value)} rows={2} style={{...inputStyle, resize: 'vertical'}} placeholder="Why do I believe this?" /></div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Outcome</label><input value={expectedOutcome} onChange={e => setExpectedOutcome(e.target.value)} placeholder="Stock hits 150 by Friday" style={inputStyle} /></div>
        </div>
      </div>

      {/* Column 2: Checklist & Rules */}
      <div>
        <h4 style={{ margin: '0 0 1rem' }}>3. The Plan & Rules</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>What must happen to win?</label><textarea value={whatMustHappen} onChange={e => setWhatMustHappen(e.target.value)} rows={2} style={{...inputStyle, resize: 'vertical'}} placeholder="Stock must move past break-even quickly" /></div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>What can go wrong?</label><textarea value={whatCanGoWrong} onChange={e => setWhatCanGoWrong(e.target.value)} rows={2} style={{...inputStyle, resize: 'vertical'}} placeholder="IV crush, earnings gap down" /></div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invalidation Rule (Stop Loss)</label><input value={invalidationRule} onChange={e => setInvalidationRule(e.target.value)} placeholder="I will exit if stock drops below 145" style={inputStyle} /></div>
          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk Assessment</label><input value={risk} onChange={e => setRisk(e.target.value)} placeholder="Max loss: $200" style={inputStyle} /></div>
        </div>

        <h4 style={{ margin: '0 0 1rem' }}>4. Pre-Trade Checklist</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px' }}>
          {Object.keys(checklist).map(key => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <input 
                type="checkbox" 
                checked={checklist[key as keyof PreTradeChecklist]} 
                onChange={e => setChecklist(prev => ({ ...prev, [key]: e.target.checked }))} 
              />
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </label>
          ))}
        </div>

        <button onClick={handleSubmit} style={{
          width: '100%', padding: '12px', fontWeight: 700, fontSize: '0.9rem',
          backgroundColor: 'var(--accent-primary)', color: '#fff',
          border: 'none', borderRadius: '4px', cursor: 'pointer'
        }}>
          Lock In Trade Idea & Open Position
        </button>
      </div>

    </div>
  );
}
