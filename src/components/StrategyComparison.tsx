'use client';
import { StrategyAnalysis } from '@/lib/payoffEngine';

interface StrategyComparisonProps {
  strategies: StrategyAnalysis[];
  onRemove: (index: number) => void;
}

export default function StrategyComparison({ strategies, onRemove }: StrategyComparisonProps) {
  if (strategies.length === 0) return null;

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem' }}>Strategy Comparison</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '8px' }}>Metric</th>
              {strategies.map((strat, i) => (
                <th key={i} style={{ padding: '8px' }}>
                  {strat.name}
                  <button 
                    onClick={() => onRemove(i)}
                    style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    (Remove)
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '8px', fontWeight: 'bold' }}>Capital Required</td>
              {strategies.map((s, i) => <td key={i} style={{ padding: '8px' }}>${s.capitalRequired.toFixed(2)}</td>)}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '8px', fontWeight: 'bold' }}>Max Profit</td>
              {strategies.map((s, i) => <td key={i} style={{ padding: '8px', color: 'var(--success)' }}>
                {s.maxProfit === null ? 'Infinite' : `$${s.maxProfit.toFixed(2)}`}
              </td>)}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '8px', fontWeight: 'bold' }}>Max Loss</td>
              {strategies.map((s, i) => <td key={i} style={{ padding: '8px', color: 'var(--danger)' }}>
                {s.maxLoss === null ? 'Infinite' : `$${Math.abs(s.maxLoss).toFixed(2)}`}
              </td>)}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '8px', fontWeight: 'bold' }}>Break-Even(s)</td>
              {strategies.map((s, i) => <td key={i} style={{ padding: '8px' }}>
                {s.breakEvens.map(b => `$${b.toFixed(2)}`).join(', ')}
              </td>)}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '8px', fontWeight: 'bold' }}>Entry Cost (Debit/Credit)</td>
              {strategies.map((s, i) => <td key={i} style={{ padding: '8px' }}>
                {s.netDebitCredit >= 0 ? `Credit: $${s.netDebitCredit.toFixed(2)}` : `Debit: $${Math.abs(s.netDebitCredit).toFixed(2)}`}
              </td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
