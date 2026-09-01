import React, { useMemo } from 'react';
import { OptionContract } from '../../lib/providers/MarketDataProvider';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface Props {
  chain: OptionContract[];
  underlyingPrice: number;
}

export const LiquidityMap: React.FC<Props> = ({ chain, underlyingPrice }) => {
  const chartData = useMemo(() => {
    const strikes = Array.from(new Set(chain.map(c => c.strike))).sort((a, b) => a - b);
    
    return strikes.map(strike => {
      const call = chain.find(c => c.strike === strike && c.type === 'call');
      const put = chain.find(c => c.strike === strike && c.type === 'put');
      
      return {
        strike,
        callVolume: call?.volume || 0,
        putVolume: put?.volume || 0,
        callOI: call?.openInterest || 0,
        putOI: put?.openInterest || 0,
      };
    });
  }, [chain]);

  if (chartData.length === 0) return <div>No data available for Liquidity Map.</div>;

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Liquidity & Concentration Map
      </h3>
      
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Volume by Strike</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Shows where trading activity is concentrated today.
        </p>
        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="strike" stroke="var(--text-muted)" type="number" domain={['dataMin', 'dataMax']} />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend />
              <ReferenceLine x={underlyingPrice} stroke="var(--text-primary)" strokeDasharray="3 3" label={{ position: 'top', value: 'Spot', fill: 'var(--text-primary)' }} />
              <Bar dataKey="callVolume" name="Call Volume" fill="#26a69a" />
              <Bar dataKey="putVolume" name="Put Volume" fill="#ef5350" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Open Interest by Strike</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Shows where existing positions are concentrated. High OI strikes often act as magnets or resistance/support levels.
        </p>
        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="strike" stroke="var(--text-muted)" type="number" domain={['dataMin', 'dataMax']} />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend />
              <ReferenceLine x={underlyingPrice} stroke="var(--text-primary)" strokeDasharray="3 3" label={{ position: 'top', value: 'Spot', fill: 'var(--text-primary)' }} />
              <Bar dataKey="callOI" name="Call Open Interest" fill="#26a69a" />
              <Bar dataKey="putOI" name="Put Open Interest" fill="#ef5350" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
