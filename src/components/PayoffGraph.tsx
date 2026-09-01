'use client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot } from 'recharts';
import { PayoffPoint } from '@/lib/payoffEngine';

interface PayoffGraphProps {
  data: PayoffPoint[];
  currentUnderlying: number;
  breakEvens: number[];
}

export default function PayoffGraph({ data, currentUnderlying, breakEvens }: PayoffGraphProps) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ width: '100%', height: '300px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', padding: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis 
            dataKey="underlyingPrice" 
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(val) => `$${val.toFixed(2)}`}
            stroke="var(--text-muted)"
          />
          <YAxis 
            tickFormatter={(val) => `$${val.toFixed(0)}`}
            stroke="var(--text-muted)"
          />
          <Tooltip 
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Profit/Loss']}
            labelFormatter={(label: number) => `Underlying: $${label.toFixed(2)}`}
            contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
          />
          <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={2} />
          <ReferenceLine x={currentUnderlying} stroke="var(--accent-primary)" strokeDasharray="3 3" label={{ position: 'top', value: 'Current Price', fill: 'var(--text-primary)' }} />
          
          {breakEvens.map((be, i) => (
             <ReferenceDot key={i} x={be} y={0} r={5} fill="var(--warning)" stroke="none" />
          ))}

          <Line 
            type="monotone" 
            dataKey="profit" 
            stroke="var(--success)" 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        PAYOFF AT EXPIRATION (Does not reflect current mark-to-market value)
      </div>
    </div>
  );
}
