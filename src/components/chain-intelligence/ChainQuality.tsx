import React from 'react';
import { OptionContract } from '../../lib/providers/MarketDataProvider';
import { calculateChainQuality } from '../../lib/chain-intelligence/engine';

interface Props {
  chain: OptionContract[];
  underlyingPrice: number;
  expiration: string;
}

export const ChainQuality: React.FC<Props> = ({ chain, underlyingPrice, expiration }) => {
  if (chain.length === 0) return <div>No chain data available.</div>;

  const metrics = calculateChainQuality(chain);
  const dte = Math.max(1, Math.ceil((new Date(expiration).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Chain Quality Overview
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="stat-box" style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Underlying / DTE</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            ${underlyingPrice.toFixed(2)} / {dte} Days
          </div>
        </div>

        <div className="stat-box" style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Volume</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {metrics.totalVolume.toLocaleString()}
          </div>
        </div>

        <div className="stat-box" style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Open Interest</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {metrics.totalOpenInterest.toLocaleString()}
          </div>
        </div>

        <div className="stat-box" style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Median Spread</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: metrics.medianSpreadPct ? (metrics.medianSpreadPct < 0.05 ? 'var(--status-success)' : metrics.medianSpreadPct > 0.15 ? 'var(--status-error)' : 'var(--text-primary)') : 'var(--text-muted)' }}>
            {metrics.medianSpreadPct ? `${(metrics.medianSpreadPct * 100).toFixed(2)}%` : 'UNAVAILABLE'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-success)' }}></div>
          <span>Data Source: <strong style={{ color: 'var(--text-primary)' }}>REAL MARKET DATA</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <span>Quoted Contracts: {metrics.quotedContracts} / {metrics.totalContracts}</span>
        </div>
      </div>
    </div>
  );
};
