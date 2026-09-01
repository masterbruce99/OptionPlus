'use client';
import { useState } from 'react';
import EducationalTooltip from './EducationalTooltip';

export default function Dashboard() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExp, setSelectedExp] = useState<string>('');
  const [chain, setChain] = useState<any[]>([]);
  const [error, setError] = useState('');

  const searchSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) return;
    
    setLoading(true);
    setError('');
    setQuote(null);
    setExpirations([]);
    setChain([]);

    try {
      // 1. Fetch Quote
      const quoteRes = await fetch(`/api/quote?symbol=${symbol.toUpperCase()}`);
      if (!quoteRes.ok) {
        const errData = await quoteRes.json();
        throw new Error(errData.error || 'Failed to fetch quote');
      }
      const quoteData = await quoteRes.json();
      setQuote(quoteData);

      // 2. Fetch Expirations
      const expRes = await fetch(`/api/options/expirations?symbol=${symbol.toUpperCase()}`);
      if (expRes.ok) {
        const expData = await expRes.json();
        setExpirations(expData);
        if (expData.length > 0) {
          setSelectedExp(expData[0]);
          await fetchChain(symbol.toUpperCase(), expData[0]);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchChain = async (sym: string, exp: string) => {
    setLoading(true);
    try {
      const chainRes = await fetch(`/api/options/chain?symbol=${sym}&expiration=${exp}`);
      if (chainRes.ok) {
        const chainData = await chainRes.json();
        setChain(chainData);
      }
    } catch (err: any) {
      setError('Failed to fetch option chain.');
    } finally {
      setLoading(false);
    }
  };

  const handleExpChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const exp = e.target.value;
    setSelectedExp(exp);
    fetchChain(symbol.toUpperCase(), exp);
  };

  return (
    <div>
      <form onSubmit={searchSymbol} className="card flex items-center gap-4" style={{ marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Enter Symbol (e.g. AAPL)" 
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{ 
            padding: '10px', 
            borderRadius: '4px', 
            border: '1px solid var(--border-color)', 
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: '1rem'
          }}
        />
        <button 
          type="submit" 
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Loading...' : 'Search'}
        </button>
      </form>

      {error && <div className="card text-danger" style={{ marginBottom: '2rem' }}>{error}</div>}

      {quote && (
        <div className="card animate-fade-in" style={{ marginBottom: '2rem' }}>
          <h2>{quote.symbol} - ${quote.price.toFixed(2)}</h2>
          <p className={quote.change >= 0 ? 'text-success' : 'text-danger'}>
            {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercentage.toFixed(2)}%)
          </p>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Volume: {quote.volume}</p>
        </div>
      )}

      {expirations.length > 0 && (
        <div className="card animate-fade-in">
          <div className="flex items-center gap-4" style={{ marginBottom: '1rem' }}>
            <h3>Options Chain</h3>
            <select 
              value={selectedExp} 
              onChange={handleExpChange}
              style={{
                padding: '8px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px'
              }}
            >
              {expirations.map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px' }}>Type</th>
                  <th style={{ padding: '12px' }}><EducationalTooltip term="Strike Price">Strike</EducationalTooltip></th>
                  <th style={{ padding: '12px' }}><EducationalTooltip term="Bid">Bid</EducationalTooltip></th>
                  <th style={{ padding: '12px' }}><EducationalTooltip term="Ask">Ask</EducationalTooltip></th>
                  <th style={{ padding: '12px' }}><EducationalTooltip term="Volume">Volume</EducationalTooltip></th>
                  <th style={{ padding: '12px' }}><EducationalTooltip term="Open Interest">OI</EducationalTooltip></th>
                  <th style={{ padding: '12px' }}><EducationalTooltip term="Implied Volatility">IV</EducationalTooltip></th>
                  <th style={{ padding: '12px' }}><EducationalTooltip term="Delta">Delta</EducationalTooltip></th>
                </tr>
              </thead>
              <tbody>
                {chain.length > 0 ? chain.map((opt, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: opt.type === 'call' ? 'var(--success)' : 'var(--danger)' }}>
                      <EducationalTooltip term={opt.type === 'call' ? 'Call' : 'Put'}>{opt.type.toUpperCase()}</EducationalTooltip>
                    </td>
                    <td style={{ padding: '12px' }}>{opt.strike}</td>
                    <td style={{ padding: '12px' }}>${opt.bid}</td>
                    <td style={{ padding: '12px' }}>${opt.ask}</td>
                    <td style={{ padding: '12px' }}>{opt.volume}</td>
                    <td style={{ padding: '12px' }}>{opt.openInterest}</td>
                    <td style={{ padding: '12px' }}>{(opt.impliedVolatility * 100).toFixed(2)}%</td>
                    <td style={{ padding: '12px' }}>{opt.greeks?.delta ? opt.greeks.delta.toFixed(3) : '-'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} style={{ padding: '12px', textAlign: 'center' }}>No options found for this expiration.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
