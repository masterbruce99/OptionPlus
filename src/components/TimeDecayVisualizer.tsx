'use client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { OptionContract } from '@/lib/providers/MarketDataProvider';

interface TimeDecayVisualizerProps {
  contract: OptionContract;
  daysToExpiration: number;
}

export default function TimeDecayVisualizer({ contract, daysToExpiration }: TimeDecayVisualizerProps) {
  if (!contract.greeks || !contract.greeks.theta) {
    return (
      <div className="card text-muted">
        Time decay visualization unavailable (missing Theta in real market data).
      </div>
    );
  }

  // Simplified visualizer assuming linear theta (not reality, but good enough for beginner conceptualization)
  // Realistically theta accelerates for ATM options.
  const theta = contract.greeks.theta;
  const currentPrice = contract.last || ((contract.bid + contract.ask) / 2);
  
  // We'll plot from now until expiration
  const data = [];
  const days = Math.min(30, daysToExpiration); // Plot up to 30 days or DTE

  let estimatedValue = currentPrice;
  for (let i = 0; i <= days; i++) {
    data.push({
      day: i,
      value: Math.max(0, estimatedValue) // Can't be negative
    });
    // Theta is usually negative, representing loss per day
    estimatedValue += theta; 
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '0.5rem' }}>Time Decay (Theta) Visualizer</h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        If the stock price and volatility do not move, here is how the option&apos;s value is estimated to bleed out over time due to Theta.
        <br />
        <span style={{ color: 'var(--warning)' }}>DATA SOURCE: MODEL ESTIMATE based on current Theta.</span>
      </p>

      <div style={{ width: '100%', height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis 
              dataKey="day" 
              type="number"
              domain={[0, 'dataMax']}
              tickFormatter={(val) => `Day ${val}`}
              stroke="var(--text-muted)"
            />
            <YAxis 
              tickFormatter={(val) => `$${val.toFixed(2)}`}
              stroke="var(--text-muted)"
              domain={[0, 'auto']}
            />
            <Tooltip 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [typeof value === 'number' ? `$${value.toFixed(2)}` : `$${Number(value).toFixed(2)}`, 'Est. Value']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) => `Days Passed: ${label}`}
              contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="var(--danger)" 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
