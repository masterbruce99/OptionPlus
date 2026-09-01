'use client';
import { OptionContract } from '@/lib/providers/MarketDataProvider';
import { TradeLeg } from '@/lib/payoffEngine';
import EducationalTooltip from './EducationalTooltip';

interface GreekExposureProps {
  legs: TradeLeg[];
  contracts: Map<string, OptionContract>; // Key is leg id
}

export default function GreekExposure({ legs, contracts }: GreekExposureProps) {
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;
  
  let allAvailable = true;

  legs.forEach(leg => {
    if (leg.type === 'stock') {
      const dir = leg.side === 'long' ? 1 : -1;
      totalDelta += dir * leg.quantity * leg.multiplier; 
      // Gamma, Theta, Vega are 0 for stock
      return;
    }

    const contract = contracts.get(leg.id);
    if (!contract || !contract.greeks) {
      allAvailable = false;
      return;
    }

    const dir = leg.side === 'long' ? 1 : -1;
    const qty = leg.quantity * leg.multiplier;

    totalDelta += dir * (contract.greeks.delta ?? 0) * qty;
    totalGamma += dir * (contract.greeks.gamma ?? 0) * qty;
    totalTheta += dir * (contract.greeks.theta ?? 0) * qty;
    totalVega += dir * (contract.greeks.vega ?? 0) * qty;
  });

  if (!allAvailable) {
    return (
      <div className="card text-muted">
        Greek exposure unavailable (missing real market data for some legs).
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem' }}>Position Greek Exposure (Dollars)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        
        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <EducationalTooltip term="Delta">Est. P/L for $1 move</EducationalTooltip>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: totalDelta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {totalDelta >= 0 ? '+' : ''}${totalDelta.toFixed(2)}
          </div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <EducationalTooltip term="Gamma">Est. Delta change / $1</EducationalTooltip>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            {totalGamma >= 0 ? '+' : ''}{totalGamma.toFixed(2)}
          </div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <EducationalTooltip term="Theta">Est. Daily Time Decay</EducationalTooltip>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: totalTheta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {totalTheta >= 0 ? '+' : ''}${totalTheta.toFixed(2)}
          </div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <EducationalTooltip term="Vega">Est. P/L for 1% IV move</EducationalTooltip>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: totalVega >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {totalVega >= 0 ? '+' : ''}${totalVega.toFixed(2)}
          </div>
        </div>

      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
        DATA SOURCE: CALCULATED FROM REAL MARKET DATA. Greeks are theoretical sensitivities, not guarantees.
      </div>
    </div>
  );
}
