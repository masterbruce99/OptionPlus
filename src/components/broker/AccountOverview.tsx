'use client';
import React from 'react';
import { BrokerAccount } from '@/lib/broker/types';
import { calculateAccountAwareRisk } from '@/lib/broker/accountRiskEngine';
import { PortfolioGreeks } from '@/lib/portfolio/types';

interface Props {
  account: BrokerAccount | null;
  greeks: PortfolioGreeks;
}

export const AccountOverview: React.FC<Props> = ({ account, greeks }) => {
  const risk = calculateAccountAwareRisk(account, greeks);

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>Account Overview</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Net Liquidation', value: risk.netLiquidationValue },
          { label: 'Buying Power', value: risk.buyingPowerAvailable },
          { label: 'Available Funds', value: risk.availableFunds },
          { label: 'Margin Used', value: risk.marginUtilizationPct !== null ? `${risk.marginUtilizationPct.toFixed(1)}%` : 'INSUFFICIENT BROKER DATA' },
        ].map(({ label, value }) => {
          const isUnavail = value.includes('INSUFFICIENT') || value.includes('UNAVAILABLE');
          return (
            <div key={label} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: isUnavail ? 'var(--text-muted)' : 'var(--text-primary)', fontFamily: 'monospace' }}>
                {value}
              </div>
              {isUnavail && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Not provided by broker</div>
              )}
            </div>
          );
        })}
      </div>

      {risk.warningFlags.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {risk.warningFlags.map((w, i) => (
            <div key={i} style={{ padding: '0.5rem 0.75rem', marginBottom: '0.5rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '6px', fontSize: '0.82rem', color: '#fbbf24' }}>
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
        <strong>About this data:</strong> {risk.riskCapacityDescription}
      </div>

      {account && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Provider: <strong>{account.provider.toUpperCase()}</strong> · Currency: <strong>{account.currency}</strong> ·
          Retrieved: <strong>{account.retrievedAt ? new Date(account.retrievedAt).toLocaleString() : 'UNKNOWN'}</strong>
        </div>
      )}
    </div>
  );
};
