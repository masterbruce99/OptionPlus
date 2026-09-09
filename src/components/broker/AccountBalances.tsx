'use client';
import React from 'react';
import { BrokerAccount } from '@/lib/broker/types';
import { formatBrokerMoney, isBrokerValueAvailable } from '@/lib/broker/accountParser';
import { explainAccountField } from '@/lib/broker/accountRiskEngine';

interface Props {
  account: BrokerAccount | null;
}

const UNAVAIL = 'INSUFFICIENT BROKER DATA';

function Field({ label, value, explain }: { label: string; value: string; explain?: string }) {
  const isUnavail = value === UNAVAIL || value.includes('UNAVAILABLE') || value.includes('INSUFFICIENT');
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)' }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</div>
        {explain && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '340px' }}>{explain}</div>}
      </div>
      <div style={{ textAlign: 'right', fontWeight: 600, color: isUnavail ? 'var(--text-muted)' : 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
        {value}
      </div>
    </div>
  );
}

export const AccountBalances: React.FC<Props> = ({ account }) => {
  if (!account) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: '1.5rem 0', textAlign: 'center' }}>
        <p>No account data available.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Connect a broker in Settings to see live account balances.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Account Balances</h3>
        <div style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(52,211,153,0.1)', border: '1px solid #34d399', borderRadius: '4px', color: '#34d399' }}>
          BROKER-REPORTED · {account.provider.toUpperCase()}
        </div>
      </div>

      {isBrokerValueAvailable(account.accountId) && (
        <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Account: {account.accountId.value} (ID redacted for security)
        </div>
      )}

      <Field label="Net Liquidation Value"  value={formatBrokerMoney(account.netLiquidationValue)}  explain={explainAccountField('netLiquidationValue')} />
      <Field label="Cash Balance"           value={formatBrokerMoney(account.cashBalance)}           explain={explainAccountField('cashBalance')} />
      <Field label="Buying Power"           value={formatBrokerMoney(account.buyingPower)}           explain={explainAccountField('buyingPower')} />
      <Field label="Available Funds"        value={formatBrokerMoney(account.availableFunds)}        explain={explainAccountField('availableFunds')} />
      <Field label="Settled Cash"           value={formatBrokerMoney(account.settledCash)}           explain={explainAccountField('settledCash')} />
      <Field label="Initial Margin Req."    value={formatBrokerMoney(account.initialMarginReq)} />
      <Field label="Maintenance Margin Req" value={formatBrokerMoney(account.maintenanceMarginReq)} explain={explainAccountField('maintenanceMarginReq')} />
      <Field label="Margin Used"            value={formatBrokerMoney(account.marginUsed)}            explain={explainAccountField('marginUsed')} />
      <Field label="Margin Available"       value={formatBrokerMoney(account.marginAvailable)}       explain={explainAccountField('marginAvailable')} />

      {account.retrievedAt && (
        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Data retrieved: {new Date(account.retrievedAt).toLocaleString()} · Source: BROKER-REPORTED
        </div>
      )}

      <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        ⚠ OptionPlus cannot verify these values independently. All balances are as reported by the connected broker.
        Fields showing &ldquo;INSUFFICIENT BROKER DATA&rdquo; were not provided by the broker for this account type.
      </div>
    </div>
  );
};
