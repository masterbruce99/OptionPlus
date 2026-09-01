import React, { useMemo, useState, useEffect } from 'react';
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
  symbol: string;
  chain: OptionContract[]; // Current active chain
  expirations: string[];
  underlyingPrice: number;
}

export const VolatilityAnalysis: React.FC<Props> = ({ symbol, chain, expirations, underlyingPrice }) => {
  const [multiChains, setMultiChains] = useState<Record<string, OptionContract[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Module 3: IV Smile / Skew (Current Chain)
  const smileData = useMemo(() => {
    const strikes = Array.from(new Set(chain.map(c => c.strike))).sort((a, b) => a - b);
    return strikes.map(strike => {
      const call = chain.find(c => c.strike === strike && c.type === 'call');
      const put = chain.find(c => c.strike === strike && c.type === 'put');
      return {
        strike,
        callIV: call?.impliedVolatility ? call.impliedVolatility * 100 : null,
        putIV: put?.impliedVolatility ? put.impliedVolatility * 100 : null
      };
    });
  }, [chain]);

  // Fetch up to 4 near-term expirations for Term Structure & Surface
  useEffect(() => {
    const fetchMultiChains = async () => {
      if (expirations.length === 0) return;
      setLoading(true);
      
      const expsToFetch = expirations.slice(0, 4);
      const newMultiChains: Record<string, OptionContract[]> = {};
      
      try {
        for (const exp of expsToFetch) {
          // If it's the currently active one, we already have it
          if (chain.length > 0 && chain[0].expiration === exp) {
            newMultiChains[exp] = chain;
            continue;
          }
          
          const res = await fetch(`/api/options/chain?symbol=${symbol}&expiration=${exp}`);
          if (res.ok) {
            newMultiChains[exp] = await res.json();
          }
        }
        setMultiChains(newMultiChains);
      } catch (e: unknown) {
        console.error(e);
        setError('Failed to fetch multiple chains for surface analysis.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMultiChains();
  }, [symbol, expirations, chain]);

  // Module 13: IV Term Structure
  const termStructureData = useMemo(() => {
    const data: { expiration: string; dte: number; atmStrike: number; callIV: number | null; putIV: number | null }[] = [];
    Object.keys(multiChains).sort().forEach(exp => {
      const c = multiChains[exp];
      if (c.length === 0) return;
      
      // Find ATM strike
      let atmStrike = c[0].strike;
      let minDiff = Math.abs(c[0].strike - underlyingPrice);
      for (const contract of c) {
        const diff = Math.abs(contract.strike - underlyingPrice);
        if (diff < minDiff) {
          minDiff = diff;
          atmStrike = contract.strike;
        }
      }
      
      // Get Call and Put ATM IV
      const call = c.find(x => x.strike === atmStrike && x.type === 'call');
      const put = c.find(x => x.strike === atmStrike && x.type === 'put');
      
      const dte = Math.max(1, Math.ceil((new Date(exp).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
      
      data.push({
        expiration: exp,
        dte,
        atmStrike,
        callIV: call?.impliedVolatility ? call.impliedVolatility * 100 : null,
        putIV: put?.impliedVolatility ? put.impliedVolatility * 100 : null
      });
    });
    return data;
  }, [multiChains, underlyingPrice]);

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Volatility Intelligence
      </h3>

      {/* MODULE 3: IV Smile / Skew */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>IV Smile / Skew (Current Expiration)</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Visualizes implied volatility across strikes. Notice how out-of-the-money puts often trade at a higher IV than out-of-the-money calls (the &quot;Volatility Skew&quot;).
        </p>
        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={smileData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="strike" stroke="var(--text-muted)" type="number" domain={['dataMin', 'dataMax']} />
              <YAxis stroke="var(--text-muted)" tickFormatter={(val) => `${val}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [typeof value === 'number' ? `${value.toFixed(2)}%` : value, undefined]}
              />
              <Legend />
              <ReferenceLine x={underlyingPrice} stroke="var(--text-primary)" strokeDasharray="3 3" label={{ position: 'top', value: 'Spot', fill: 'var(--text-primary)' }} />
              <Line type="monotone" dataKey="callIV" name="Call IV" stroke="#26a69a" dot={false} activeDot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="putIV" name="Put IV" stroke="#ef5350" dot={false} activeDot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MODULE 13: Term Structure */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>IV Term Structure (ATM Options)</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Term structure describes how implied volatility differs across expiration dates. A rising structure (contango) implies higher expected volatility in the future.
        </p>
        
        {loading && <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading multi-expiration data...</div>}
        {error && <div style={{ padding: '1rem', color: 'var(--status-error)' }}>{error}</div>}
        
        {!loading && !error && termStructureData.length > 0 && (
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={termStructureData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="expiration" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [typeof value === 'number' ? `${value.toFixed(2)}%` : value, undefined]}
                  labelFormatter={(label) => `Expiration: ${label}`}
                />
                <Legend />
                <Line type="monotone" dataKey="callIV" name="ATM Call IV" stroke="#26a69a" activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="putIV" name="ATM Put IV" stroke="#ef5350" activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* MODULE 14: Volatility Change */}
      <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '0.9rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Historical Volatility Change</h4>
        <p style={{ color: 'var(--status-error)' }}>HISTORICAL CHANGE UNAVAILABLE</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          The current market data provider does not return historical time-series of implied volatility. No fabricated historical data is displayed.
        </p>
      </div>

    </div>
  );
};
