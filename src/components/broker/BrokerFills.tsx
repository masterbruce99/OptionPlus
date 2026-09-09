'use client';
import React from 'react';
import { BrokerFill } from '@/lib/broker/types';
import { isBrokerValueAvailable } from '@/lib/broker/accountParser';
import { describeFillForJournal } from '@/lib/broker/fillImportEngine';

interface Props {
  fills: BrokerFill[];
}

export const BrokerFills: React.FC<Props> = ({ fills }) => {
  if (fills.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: '1.5rem 0', textAlign: 'center' }}>
        <p>No fill history imported.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Import fill history from your broker to enrich trade lifecycle and journal records.
          Fills are not inferred from quotes.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Fill History ({fills.length})</h3>
        <div style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(52,211,153,0.1)', border: '1px solid #34d399', borderRadius: '4px', color: '#34d399' }}>
          BROKER-IMPORTED
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              {['Time', 'Symbol', 'Side', 'Qty', 'Fill Price', 'Fees', 'Currency', 'Exec ID'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fills.map((fill) => (
              <tr key={fill.executionId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(fill.timestamp).toLocaleString()}
                </td>
                <td style={{ padding: '8px', fontWeight: 600 }}>{fill.symbol}</td>
                <td style={{ padding: '8px', color: fill.side === 'buy' ? '#34d399' : '#f87171', fontWeight: 600, textTransform: 'uppercase' }}>{fill.side}</td>
                <td style={{ padding: '8px' }}>{fill.quantity}</td>
                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{fill.fillPrice.toFixed(2)}</td>
                <td style={{ padding: '8px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {isBrokerValueAvailable(fill.fees) ? `${fill.fees.value!.toFixed(2)}` : 'N/A'}
                </td>
                <td style={{ padding: '8px' }}>{fill.currency}</td>
                <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fill.executionId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>Journal Description Preview (most recent fill)</h4>
        <code style={{ display: 'block', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
          {describeFillForJournal(fills[fills.length - 1])}
        </code>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '6px' }}>
        Fills are sourced directly from the broker. OptionPlus never infers fills from quotes or midpoint prices.
        Fees marked &ldquo;N/A&rdquo; were not provided by the broker for these executions.
      </div>
    </div>
  );
};
