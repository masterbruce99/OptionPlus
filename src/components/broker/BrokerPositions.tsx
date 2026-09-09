'use client';
import React from 'react';
import { BrokerPosition } from '@/lib/broker/types';
import { isBrokerValueAvailable } from '@/lib/broker/accountParser';

interface Props {
  positions: BrokerPosition[];
}

export const BrokerPositions: React.FC<Props> = ({ positions }) => {
  if (positions.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: '1.5rem 0', textAlign: 'center' }}>
        <p>No broker positions imported.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Connect and sync your broker to import live positions.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Broker Positions ({positions.length})</h3>
        <div style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(52,211,153,0.1)', border: '1px solid #34d399', borderRadius: '4px', color: '#34d399' }}>
          BROKER-IMPORTED · READ-ONLY
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              {['Symbol', 'Type', 'Strike', 'Expiration', 'Qty', 'Avg Cost', 'Market Value', 'Unrealized P&L'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const pnl = isBrokerValueAvailable(pos.unrealizedPnL) ? pos.unrealizedPnL.value! : null;
              const pnlColor = pnl === null ? 'var(--text-muted)' : pnl >= 0 ? '#34d399' : '#f87171';
              return (
                <tr key={pos.brokerId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{pos.symbol}</td>
                  <td style={{ padding: '8px', textTransform: 'uppercase' }}>{pos.optionType ?? 'STOCK'}</td>
                  <td style={{ padding: '8px' }}>{pos.strike ?? '—'}</td>
                  <td style={{ padding: '8px' }}>{pos.expiration ?? '—'}</td>
                  <td style={{ padding: '8px', color: pos.quantity < 0 ? '#f87171' : '#34d399', fontWeight: 600 }}>
                    {pos.quantity > 0 ? '+' : ''}{pos.quantity}
                  </td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                    {isBrokerValueAvailable(pos.averageCost) ? `${pos.currency} ${pos.averageCost.value!.toFixed(2)}` : 'N/A'}
                  </td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                    {isBrokerValueAvailable(pos.marketValue) ? `${pos.currency} ${pos.marketValue.value!.toFixed(2)}` : 'N/A'}
                  </td>
                  <td style={{ padding: '8px', fontFamily: 'monospace', color: pnlColor, fontWeight: 600 }}>
                    {pnl !== null ? `${pnl >= 0 ? '+' : ''}${pos.currency} ${pnl.toFixed(2)}` : 'INSUFFICIENT BROKER DATA'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '6px' }}>
        All values are BROKER-REPORTED and subject to broker data quality. OptionPlus does not verify market values or P&amp;L independently.
      </div>
    </div>
  );
};
