import React, { useMemo } from 'react';
import { OptionContract } from '../../lib/providers/MarketDataProvider';
import {
  LineChart,
  Line,
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

export const GreekCurves: React.FC<Props> = ({ chain, underlyingPrice }) => {
  const chartData = useMemo(() => {
    const strikes = Array.from(new Set(chain.map(c => c.strike))).sort((a, b) => a - b);
    
    return strikes.map(strike => {
      const call = chain.find(c => c.strike === strike && c.type === 'call');
      const put = chain.find(c => c.strike === strike && c.type === 'put');
      
      return {
        strike,
        callDelta: call?.greeks?.delta,
        putDelta: put?.greeks?.delta,
        callGamma: call?.greeks?.gamma,
        putGamma: put?.greeks?.gamma,
        callTheta: call?.greeks?.theta,
        putTheta: put?.greeks?.theta,
        callVega: call?.greeks?.vega,
        putVega: put?.greeks?.vega,
      };
    });
  }, [chain]);

  if (chartData.length === 0) return <div>No data available for Greek Curves.</div>;

  const renderChart = (dataKeyCall: string, dataKeyPut: string, title: string, explanation: string) => (
    <div style={{ marginBottom: '2rem' }}>
      <h4 style={{ marginBottom: '0.5rem' }}>{title} Curve</h4>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{explanation}</p>
      <div style={{ height: 300, width: '100%' }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="strike" stroke="var(--text-muted)" type="number" domain={['dataMin', 'dataMax']} />
            <YAxis stroke="var(--text-muted)" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
              itemStyle={{ color: 'var(--text-primary)' }}
            />
            <Legend />
            <ReferenceLine x={underlyingPrice} stroke="var(--text-primary)" strokeDasharray="3 3" label={{ position: 'top', value: 'Spot', fill: 'var(--text-primary)' }} />
            <Line type="monotone" dataKey={dataKeyCall} name="Call" stroke="#26a69a" dot={false} activeDot={{ r: 4 }} connectNulls />
            <Line type="monotone" dataKey={dataKeyPut} name="Put" stroke="#ef5350" dot={false} activeDot={{ r: 4 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Greek Curves
      </h3>
      
      {renderChart(
        'callDelta', 
        'putDelta', 
        'Delta', 
        'Delta measures the expected change in option price for a $1 change in the underlying. Call Delta is positive (approaching 1 as it gets deeper ITM), Put Delta is negative (approaching -1 as it gets deeper ITM).'
      )}

      {renderChart(
        'callGamma', 
        'putGamma', 
        'Gamma', 
        'Gamma measures how quickly Delta changes when the underlying price changes. Notice how Gamma concentrates around the At-The-Money (ATM) strike, making ATM options highly sensitive to underlying movement.'
      )}

      {renderChart(
        'callTheta', 
        'putTheta', 
        'Theta', 
        'Theta represents time-decay sensitivity under the data/model assumptions. A more negative Theta indicates faster daily value decay, typically peaking near the ATM strike.'
      )}

      {renderChart(
        'callVega', 
        'putVega', 
        'Vega', 
        'Vega represents sensitivity to implied volatility changes (expected price change per 1% change in IV). Vega is typically highest for ATM options.'
      )}
    </div>
  );
};
