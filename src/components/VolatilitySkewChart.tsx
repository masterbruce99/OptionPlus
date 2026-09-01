'use client';
import { calculateVolatilitySkew } from '@/lib/volatilityEngine';
import { OptionContract } from '@/lib/providers/MarketDataProvider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface VolatilitySkewChartProps {
  chain: OptionContract[];
  underlyingPrice: number;
}

export default function VolatilitySkewChart({ chain, underlyingPrice }: VolatilitySkewChartProps) {
  const skewData = calculateVolatilitySkew(chain, underlyingPrice);

  if (skewData.length === 0) {
    return (
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>📈 Volatility Skew</h4>
        <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
          INSUFFICIENT DATA — No implied volatility data available in the current chain.
        </p>
      </div>
    );
  }

  const calls = skewData.filter(p => p.type === 'call').map(p => ({ strike: p.strike, iv: p.iv * 100 }));
  const puts = skewData.filter(p => p.type === 'put').map(p => ({ strike: p.strike, iv: p.iv * 100 }));

  // Merge into single dataset keyed by strike
  const strikeMap = new Map<number, { strike: number; callIV?: number; putIV?: number }>();
  calls.forEach(c => {
    const existing = strikeMap.get(c.strike) || { strike: c.strike };
    existing.callIV = c.iv;
    strikeMap.set(c.strike, existing);
  });
  puts.forEach(p => {
    const existing = strikeMap.get(p.strike) || { strike: p.strike };
    existing.putIV = p.iv;
    strikeMap.set(p.strike, existing);
  });

  const chartData = Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>📈 Volatility Skew</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="strike" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [typeof value === 'number' ? `${value.toFixed(1)}%` : `${value}%`]}
          />
          <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
          <Line type="monotone" dataKey="callIV" name="Call IV" stroke="var(--success)" dot={{ r: 2 }} strokeWidth={2} connectNulls />
          <Line type="monotone" dataKey="putIV" name="Put IV" stroke="var(--danger)" dot={{ r: 2 }} strokeWidth={2} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
        Underlying: ${underlyingPrice.toFixed(2)} · REAL MARKET DATA · IV across strikes for current expiration.
        Skew reflects demand for downside protection and may not persist.
      </p>
    </div>
  );
}
