'use client';
import React from 'react';
import { BrokerOrder } from '@/lib/broker/types';
import { isBrokerValueAvailable } from '@/lib/broker/accountParser';

interface Props {
  orders: BrokerOrder[];
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#60a5fa',
  FILLED: '#34d399',
  PARTIALLY_FILLED: '#fbbf24',
  CANCELLED: '#9ca3af',
  REJECTED: '#f87171',
  EXPIRED: '#9ca3af',
  UNKNOWN: '#9ca3af',
};

export const BrokerOrders: React.FC<Props> = ({ orders }) => {
  if (orders.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: '1.5rem 0', textAlign: 'center' }}>
        <p>No broker orders imported.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Order history is displayed in read-only mode. No order modification is possible.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Order History — Read Only ({orders.length})</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(52,211,153,0.1)', border: '1px solid #34d399', borderRadius: '4px', color: '#34d399' }}>BROKER-REPORTED</div>
          <div style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(248,113,113,0.1)', border: '1px solid #f87171', borderRadius: '4px', color: '#f87171' }}>NO ORDER MODIFICATION</div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              {['Time', 'Symbol', 'Side', 'Qty', 'Type', 'Limit', 'Status', 'Filled', 'Avg Fill'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const statusColor = STATUS_COLORS[order.status] ?? '#9ca3af';
              return (
                <tr key={order.orderId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(order.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{order.symbol}</td>
                  <td style={{ padding: '8px', color: order.side === 'buy' ? '#34d399' : '#f87171', fontWeight: 600, textTransform: 'uppercase' }}>{order.side}</td>
                  <td style={{ padding: '8px' }}>{order.quantity}</td>
                  <td style={{ padding: '8px', textTransform: 'uppercase', fontSize: '0.8rem' }}>{order.orderType}</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>{order.limitPrice != null ? order.limitPrice.toFixed(2) : '—'}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ color: statusColor, fontWeight: 600, fontSize: '0.8rem' }}>{order.status}</span>
                  </td>
                  <td style={{ padding: '8px' }}>{order.filledQuantity}</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                    {isBrokerValueAvailable(order.averageFillPrice) ? order.averageFillPrice.value!.toFixed(2) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px' }}>
        🔒 ORDER HISTORY IS DISPLAYED FOR REFERENCE ONLY. OptionPlus does not submit, modify, cancel, or replace orders.
        All data is BROKER-REPORTED and subject to broker data quality.
      </div>
    </div>
  );
};
