import React, { useState } from 'react';
import { OptionContract } from '../../lib/providers/MarketDataProvider';
import { simulatePortfolioImpact } from '../../lib/chain-intelligence/engine';

interface Props {
  contract: OptionContract | null;
}

export const HypotheticalSimulator: React.FC<Props> = ({ contract }) => {
  const [quantity, setQuantity] = useState(1);

  if (!contract) return <div>Select a contract from the Strike Map to simulate portfolio impact.</div>;

  const sim = simulatePortfolioImpact([], { contract, quantity });

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Hypothetical Simulator
      </h3>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Simulated Quantity (Negative for Short)
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn" onClick={() => setQuantity(q => q - 1)}>-</button>
          <input 
            type="number" 
            value={quantity} 
            onChange={e => setQuantity(parseInt(e.target.value) || 0)}
            style={{ padding: '0.5rem', width: '80px', textAlign: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
          <button className="btn" onClick={() => setQuantity(q => q + 1)}>+</button>
        </div>
      </div>

      <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>Impact on Empty Portfolio</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Capital Required (Debit/Credit)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: sim.capitalRequired > 0 ? 'var(--status-error)' : 'var(--status-success)' }}>
            {sim.capitalRequired > 0 ? `Debit: $${sim.capitalRequired.toFixed(2)}` : `Credit: $${Math.abs(sim.capitalRequired).toFixed(2)}`}
          </div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Delta ($)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {sim.newDelta.toFixed(2)}
          </div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Gamma ($)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {sim.newGamma.toFixed(2)}
          </div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Theta ($)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {sim.newTheta.toFixed(2)}
          </div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Vega ($)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {sim.newVega.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
