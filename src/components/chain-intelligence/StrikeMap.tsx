import React, { useMemo } from 'react';
import { OptionContract } from '../../lib/providers/MarketDataProvider';

import { ExpectedMove } from '../../lib/probability/types';

interface Props {
  chain: OptionContract[];
  underlyingPrice: number;
  expectedMove: ExpectedMove | null;
  onSelectContract?: (contract: OptionContract) => void;
}

export const StrikeMap: React.FC<Props> = ({ chain, underlyingPrice, expectedMove, onSelectContract }) => {
  const strikes = useMemo(() => {
    const map = new Map<number, { call?: OptionContract; put?: OptionContract }>();
    chain.forEach(c => {
      if (!map.has(c.strike)) map.set(c.strike, {});
      if (c.type === 'call') map.get(c.strike)!.call = c;
      if (c.type === 'put') map.get(c.strike)!.put = c;
    });
    return Array.from(map.entries())
      .map(([strike, data]) => ({ strike, ...data }))
      .sort((a, b) => a.strike - b.strike);
  }, [chain]);

  const renderValue = (val: number | null | undefined, format: 'currency' | 'pct' | 'num' = 'num') => {
    if (val == null) return <span style={{ color: 'var(--text-muted)' }}>UNAVAILABLE</span>;
    if (format === 'currency') return `$${val.toFixed(2)}`;
    if (format === 'pct') return `${(val * 100).toFixed(2)}%`;
    return val.toFixed(4);
  };

  const emLower = expectedMove?.impliedRangeLow;
  const emUpper = expectedMove?.impliedRangeHigh;

  return (
    <div className="card" style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Strike Map & Call/Put Comparison
      </h3>
      
      {expectedMove?.status === 'REAL DATA' && (
        <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderLeft: '3px solid var(--accent-primary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <strong>Market-Implied Expected Range:</strong> ${emLower?.toFixed(2)} to ${emUpper?.toFixed(2)} 
          <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>(±{(expectedMove.percentage * 100).toFixed(1)}%)</span>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
            <th colSpan={6} style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(38, 166, 154, 0.1)' }}>CALLS</th>
            <th rowSpan={2} style={{ padding: '0.5rem', width: '80px', textAlign: 'center', background: 'var(--bg-tertiary)' }}>STRIKE</th>
            <th colSpan={6} style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(239, 83, 80, 0.1)' }}>PUTS</th>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>
            <th style={{ padding: '0.5rem' }}>IV</th>
            <th style={{ padding: '0.5rem' }}>Vega</th>
            <th style={{ padding: '0.5rem' }}>Theta</th>
            <th style={{ padding: '0.5rem' }}>Gamma</th>
            <th style={{ padding: '0.5rem' }}>Delta</th>
            <th style={{ padding: '0.5rem' }}>Bid/Ask</th>

            <th style={{ padding: '0.5rem' }}>Bid/Ask</th>
            <th style={{ padding: '0.5rem' }}>Delta</th>
            <th style={{ padding: '0.5rem' }}>Gamma</th>
            <th style={{ padding: '0.5rem' }}>Theta</th>
            <th style={{ padding: '0.5rem' }}>Vega</th>
            <th style={{ padding: '0.5rem' }}>IV</th>
          </tr>
        </thead>
        <tbody>
          {strikes.map(({ strike, call, put }) => {
            const isITMCall = underlyingPrice > strike;
            const isITMPut = underlyingPrice < strike;
            const isExpected = (emLower && emUpper) ? (strike >= emLower && strike <= emUpper) : false;

            return (
              <tr key={strike} style={{ borderBottom: '1px solid var(--border-color)', background: isExpected ? 'rgba(255, 255, 255, 0.02)' : 'transparent' }}>
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMCall ? 'rgba(38, 166, 154, 0.05)' : '' }} className="cursor-pointer" onClick={() => call && onSelectContract?.(call)}>
                  {renderValue(call?.impliedVolatility, 'pct')}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMCall ? 'rgba(38, 166, 154, 0.05)' : '' }}>{renderValue(call?.greeks?.vega)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMCall ? 'rgba(38, 166, 154, 0.05)' : '' }}>{renderValue(call?.greeks?.theta)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMCall ? 'rgba(38, 166, 154, 0.05)' : '' }}>{renderValue(call?.greeks?.gamma)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMCall ? 'rgba(38, 166, 154, 0.05)' : '' }}>{renderValue(call?.greeks?.delta)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMCall ? 'rgba(38, 166, 154, 0.05)' : '' }} className="cursor-pointer" onClick={() => call && onSelectContract?.(call)}>
                  <span style={{ color: 'var(--text-muted)' }}>{call?.bid != null ? call.bid.toFixed(2) : '-'}</span> / <span>{call?.ask != null ? call.ask.toFixed(2) : '-'}</span>
                </td>
                
                <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', background: 'var(--bg-tertiary)', position: 'relative' }}>
                  {strike.toFixed(2)}
                  {isExpected && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'var(--accent-primary)' }} title="Inside Expected Move" />}
                </td>
                
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMPut ? 'rgba(239, 83, 80, 0.05)' : '' }} className="cursor-pointer" onClick={() => put && onSelectContract?.(put)}>
                  <span style={{ color: 'var(--text-muted)' }}>{put?.bid != null ? put.bid.toFixed(2) : '-'}</span> / <span>{put?.ask != null ? put.ask.toFixed(2) : '-'}</span>
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMPut ? 'rgba(239, 83, 80, 0.05)' : '' }}>{renderValue(put?.greeks?.delta)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMPut ? 'rgba(239, 83, 80, 0.05)' : '' }}>{renderValue(put?.greeks?.gamma)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMPut ? 'rgba(239, 83, 80, 0.05)' : '' }}>{renderValue(put?.greeks?.theta)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMPut ? 'rgba(239, 83, 80, 0.05)' : '' }}>{renderValue(put?.greeks?.vega)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', background: isITMPut ? 'rgba(239, 83, 80, 0.05)' : '' }} className="cursor-pointer" onClick={() => put && onSelectContract?.(put)}>
                  {renderValue(put?.impliedVolatility, 'pct')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
