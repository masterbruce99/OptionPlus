'use client';
import { TradeLeg } from '@/lib/payoffEngine';
import { calculateBlackScholes } from '@/lib/pricingModel';
import { OptionContract } from '@/lib/providers/MarketDataProvider';

interface ScenarioAnalysisProps {
  legs: TradeLeg[];
  currentUnderlying: number;
  contracts: Map<string, OptionContract>;
  daysToExpiration: number;
}

export default function ScenarioAnalysis({ legs, currentUnderlying, contracts, daysToExpiration }: ScenarioAnalysisProps) {
  if (legs.length === 0) return null;

  const scenarios = [-0.10, -0.05, 0, 0.05, 0.10];
  
  const calculateScenarioProfit = (movePercent: number) => {
    const newUnderlying = currentUnderlying * (1 + movePercent);
    let totalEstimatedValue = 0;
    
    legs.forEach(leg => {
      if (leg.type === 'stock') {
        const val = newUnderlying * leg.quantity * leg.multiplier;
        totalEstimatedValue += leg.side === 'long' ? val : -val;
      } else {
        const contract = contracts.get(leg.id);
        if (contract) {
          // Time to expiration in years (assuming 365 days)
          const T = Math.max(0.001, daysToExpiration / 365);
          const r = 0.05; // Assumed 5% risk-free rate
          const v = contract.impliedVolatility || 0.01;
          
          const estPrice = calculateBlackScholes({
            S: newUnderlying,
            K: leg.strike,
            T,
            r,
            v,
            type: leg.type as 'call' | 'put'
          });
          
          const val = estPrice * leg.quantity * leg.multiplier;
          totalEstimatedValue += leg.side === 'long' ? val : -val;
        }
      }
    });

    // We need to subtract the entry cost to get Profit/Loss
    let totalEntryCost = 0;
    legs.forEach(leg => {
      const cost = leg.entryPrice * leg.quantity * leg.multiplier;
      totalEntryCost += leg.side === 'long' ? cost : -cost;
    });

    return totalEstimatedValue - totalEntryCost;
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '0.5rem' }}>&quot;What If?&quot; Scenario Analysis</h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Estimated P/L if the stock immediately moves by the given percentage (assuming no change in time or implied volatility).
        <br/>
        <span style={{ color: 'var(--warning)' }}>DATA SOURCE: MODEL ESTIMATE (Black-Scholes)</span>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
        {scenarios.map(sc => {
          const profit = calculateScenarioProfit(sc);
          const isPositive = profit >= 0;
          return (
            <div key={sc} style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {sc > 0 ? '+' : ''}{(sc * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ${(currentUnderlying * (1 + sc)).toFixed(2)}
              </div>
              <div style={{ marginTop: '0.5rem', fontWeight: 'bold', color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
                {isPositive ? '+' : ''}${profit.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
