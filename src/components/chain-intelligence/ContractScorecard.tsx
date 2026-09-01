import React from 'react';
import { OptionContract } from '../../lib/providers/MarketDataProvider';
import { calculateStrikeDistance, calculateSpreadPercentage } from '../../lib/chain-intelligence/engine';
import { ExpectedMove } from '../../lib/probability/types';

interface Props {
  contract: OptionContract | null;
  underlyingPrice: number;
  expectedMove: ExpectedMove | null;
}

export const ContractScorecard: React.FC<Props> = ({ contract, underlyingPrice, expectedMove }) => {
  if (!contract) return <div>Select a contract from the Strike Map to view its scorecard.</div>;

  const spreadPct = calculateSpreadPercentage(contract.bid, contract.ask);
  const emLower = expectedMove?.impliedRangeLow;
  const emUpper = expectedMove?.impliedRangeHigh;
  const strikeDistance = calculateStrikeDistance(underlyingPrice, contract.strike, contract.ask, contract.type as 'call' | 'put', emUpper, emLower);

  const renderValue = (val: number | null | undefined, format: 'currency' | 'pct' | 'num' = 'num') => {
    if (val == null) return <span style={{ color: 'var(--text-muted)' }}>UNAVAILABLE</span>;
    if (format === 'currency') return `$${val.toFixed(2)}`;
    if (format === 'pct') return `${(val * 100).toFixed(2)}%`;
    return val.toFixed(4);
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Contract Scorecard: {contract.symbol}
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bid / Ask</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {contract.bid != null ? `$${contract.bid.toFixed(2)}` : 'N/A'} / {contract.ask != null ? `$${contract.ask.toFixed(2)}` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.85rem', color: spreadPct && spreadPct > 0.1 ? 'var(--status-warning)' : 'var(--text-muted)' }}>
            Spread: {spreadPct != null ? `${(spreadPct * 100).toFixed(2)}%` : 'UNAVAILABLE'}
          </div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Volume / OI</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {contract.volume?.toLocaleString() || 0} / {contract.openInterest?.toLocaleString() || 0}
          </div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Implied Volatility</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {renderValue(contract.impliedVolatility, 'pct')}
          </div>
        </div>
      </div>

      <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>Greeks & Sensitivity</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Delta</div>
          <div style={{ fontWeight: 'bold' }}>{renderValue(contract.greeks?.delta)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gamma</div>
          <div style={{ fontWeight: 'bold' }}>{renderValue(contract.greeks?.gamma)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Theta (Daily Decay)</div>
          <div style={{ fontWeight: 'bold', color: 'var(--status-error)' }}>
            {contract.greeks?.theta != null ? `$${(contract.greeks.theta * 100).toFixed(2)}` : 'UNAVAILABLE'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vega (per 1% IV change)</div>
          <div style={{ fontWeight: 'bold' }}>
            {contract.greeks?.vega != null ? `$${(contract.greeks.vega * 100).toFixed(2)}` : 'UNAVAILABLE'}
          </div>
        </div>
      </div>

      <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>Distance & Breakeven</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Distance from Spot</div>
          <div style={{ fontWeight: 'bold' }}>
            {renderValue(strikeDistance.absoluteSpot, 'currency')} ({renderValue(strikeDistance.percentageSpot, 'pct')})
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Distance from Breakeven (at Expiration)</div>
          <div style={{ fontWeight: 'bold' }}>
            {renderValue(strikeDistance.absoluteBreakeven, 'currency')} ({renderValue(strikeDistance.percentageBreakeven, 'pct')})
          </div>
        </div>
        {strikeDistance.distanceFromExpectedMoveBoundary != null && (
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Expected Move Boundary</div>
            <div style={{ fontWeight: 'bold' }}>
              {contract.type === 'call' 
                ? `${strikeDistance.distanceFromExpectedMoveBoundary > 0 ? 'Outside' : 'Inside'} by ${renderValue(Math.abs(strikeDistance.distanceFromExpectedMoveBoundary), 'currency')}`
                : `${strikeDistance.distanceFromExpectedMoveBoundary < 0 ? 'Outside' : 'Inside'} by ${renderValue(Math.abs(strikeDistance.distanceFromExpectedMoveBoundary), 'currency')}`
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
