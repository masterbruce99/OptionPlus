'use client';
import { assessMarketRegime } from '@/lib/volatilityEngine';
import { OptionContract } from '@/lib/providers/MarketDataProvider';

interface MarketRegimePanelProps {
  quote: { price: number; change: number; changePercentage: number; volume: number };
  chain: OptionContract[];
}

export default function MarketRegimePanel({ quote, chain }: MarketRegimePanelProps) {
  const regime = assessMarketRegime(quote, chain);

  const trendColor =
    regime.trendLabel === 'UPWARD TREND' ? 'var(--success)' :
    regime.trendLabel === 'DOWNWARD TREND' ? 'var(--danger)' :
    regime.trendLabel === 'RANGE' ? 'var(--warning, #f0ad4e)' : 'var(--text-muted)';

  const volColor =
    regime.volatilityLabel === 'HIGH VOLATILITY' ? 'var(--danger)' :
    regime.volatilityLabel === 'LOW VOLATILITY' ? 'var(--success)' :
    regime.volatilityLabel === 'MODERATE VOLATILITY' ? 'var(--warning, #f0ad4e)' : 'var(--text-muted)';

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>📊 Market Regime</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '6px', borderLeft: `3px solid ${trendColor}` }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Trend</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: trendColor }}>{regime.trendLabel}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {regime.dailyChange >= 0 ? '+' : ''}{regime.dailyChange.toFixed(2)} ({regime.dailyChangePercent.toFixed(2)}%)
          </div>
        </div>
        <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '6px', borderLeft: `3px solid ${volColor}` }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Volatility</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: volColor }}>{regime.volatilityLabel}</div>
          {regime.currentATMIV !== null && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              ATM IV: {(regime.currentATMIV * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
        {regime.dataSource} · {regime.trendMethodology.split('.')[0]}.
      </p>
    </div>
  );
}
