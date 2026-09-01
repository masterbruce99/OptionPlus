'use client';
import { useState } from 'react';
import OptionChainTable from './OptionChainTable';
import OptionDetailPanel from './OptionDetailPanel';
import StrategyAnalyzer from './StrategyAnalyzer';
import OpportunityDashboard from './OpportunityDashboard';
import { LearningJournal } from './journal/LearningJournal';
import ArbitrageScanner from './ArbitrageScanner';
import { BacktestScanner } from './BacktestScanner';
import { DataCenter } from './DataCenter';
import { PortfolioScanner } from './PortfolioScanner';
import ProbabilityScanner from './ProbabilityScanner';
import TradeSetups from './TradeSetups';
import { ActivityScanner } from './ActivityScanner';
import { ChainIntelligence } from './chain-intelligence/ChainIntelligence';
import { OptionContract } from '../lib/providers/MarketDataProvider';

export default function Dashboard() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ price: number; change: number; changePercentage: number; volume: number; symbol: string } | null>(null);
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExp, setSelectedExp] = useState<string>('');
  const [chain, setChain] = useState<OptionContract[]>([]);
  const [error, setError] = useState('');
  
  // Phase 2 State
  const [isBeginnerMode, setIsBeginnerMode] = useState(true);
  const [selectedOption, setSelectedOption] = useState<OptionContract | null>(null);
  
  // Phase 3 & later State
  const [activeTab, setActiveTab] = useState<'chain' | 'chain-intelligence' | 'analyzer' | 'arbitrage' | 'opportunities' | 'journal' | 'backtest' | 'datacenter' | 'portfolio' | 'probability' | 'trade-setups' | 'activity'>('chain');

  const searchSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) return;
    
    setLoading(true);
    setError('');
    setQuote(null);
    setExpirations([]);
    setChain([]);
    setSelectedOption(null);

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
    } catch (err: unknown) {
      setError((err as Error).message);
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
        setSelectedOption(null); // Reset selection on new chain
      }
    } catch {
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
      <div className="card flex items-center justify-between" style={{ marginBottom: '2rem' }}>
        <form onSubmit={searchSymbol} className="flex items-center gap-4">
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
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: isBeginnerMode ? 'bold' : 'normal' }}>Beginner</span>
          <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
            <input 
              type="checkbox" 
              checked={!isBeginnerMode}
              onChange={() => setIsBeginnerMode(!isBeginnerMode)}
              style={{ opacity: 0, width: 0, height: 0 }} 
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: isBeginnerMode ? 'var(--border-color)' : 'var(--accent-primary)',
              borderRadius: '20px',
              transition: '.4s'
            }}></span>
            <span style={{
              position: 'absolute',
              content: '""',
              height: '16px',
              width: '16px',
              left: isBeginnerMode ? '2px' : '22px',
              bottom: '2px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: '.4s'
            }}></span>
          </label>
          <span style={{ fontWeight: !isBeginnerMode ? 'bold' : 'normal' }}>Advanced</span>
        </div>
      </div>

      {error && <div className="card text-danger" style={{ marginBottom: '2rem' }}>{error}</div>}

      {quote && (
        <div className="card animate-fade-in" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>{quote.symbol} - ${quote.price.toFixed(2)}</h2>
              <p className={quote.change >= 0 ? 'text-success' : 'text-danger'}>
                {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercentage.toFixed(2)}%)
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="text-muted" style={{ marginTop: '0.5rem' }}>Volume: {quote.volume}</p>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>Data Status: Real-time (subject to provider)</p>
            </div>
          </div>
        </div>
      )}

      {selectedOption && quote && (
        <div style={{ marginBottom: '2rem' }}>
          <OptionDetailPanel 
            option={selectedOption} 
            underlyingPrice={quote.price} 
            onClose={() => setSelectedOption(null)} 
          />
        </div>
      )}

      {expirations.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => setActiveTab('chain')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'chain' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'chain' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Options Chain
          </button>
          <button 
            onClick={() => setActiveTab('chain-intelligence')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'chain-intelligence' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'chain-intelligence' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Chain Intelligence
          </button>
          <button 
            onClick={() => setActiveTab('analyzer')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'analyzer' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'analyzer' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Strategy Analyzer
          </button>
          <button 
            onClick={() => setActiveTab('opportunities')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'opportunities' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'opportunities' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Opportunities
          </button>
          <button 
            onClick={() => setActiveTab('arbitrage')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'arbitrage' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'arbitrage' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Arbitrage
          </button>
          <button 
            onClick={() => setActiveTab('journal')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'journal' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'journal' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Trade Journal
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'portfolio' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'portfolio' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Portfolio
          </button>
          <button 
            onClick={() => setActiveTab('backtest')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'backtest' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'backtest' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Backtest
          </button>
          <button 
            onClick={() => setActiveTab('probability')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'probability' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'probability' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Volatility & Probability
          </button>
          <button 
            onClick={() => setActiveTab('datacenter')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'datacenter' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'datacenter' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Data Center
          </button>
          <button 
            onClick={() => setActiveTab('trade-setups')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'trade-setups' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'trade-setups' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Trade Setups
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            style={{ padding: '10px 20px', backgroundColor: activeTab === 'activity' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: activeTab === 'activity' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Activity Scanner
          </button>
        </div>
      )}

      {expirations.length > 0 && activeTab === 'chain' && (
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
            <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
              Click any bid, ask, or last price to view option details.
            </span>
          </div>

          <OptionChainTable 
            chain={chain} 
            underlyingPrice={quote?.price || 0}
            isBeginnerMode={isBeginnerMode}
            onSelectOption={setSelectedOption}
          />
        </div>
      )}

      {expirations.length > 0 && activeTab === 'chain-intelligence' && (
        <div className="animate-fade-in">
          <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Analyze Expiration:</label>
            <select 
              value={selectedExp} 
              onChange={handleExpChange}
              style={{ padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
            >
              {expirations.map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          </div>
          <ChainIntelligence 
            symbol={quote?.symbol || ''}
            chain={chain}
            expirations={expirations}
            underlyingPrice={quote?.price || 0}
          />
        </div>
      )}

      {expirations.length > 0 && activeTab === 'analyzer' && (
        <div className="animate-fade-in">
          <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Analyze Expiration:</label>
            <select 
              value={selectedExp} 
              onChange={handleExpChange}
              style={{ padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
            >
              {expirations.map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          </div>
          <StrategyAnalyzer 
            currentUnderlying={quote?.price || 0}
            chain={chain}
            daysToExpiration={
              // Simple DTE calculation for visualizer
              selectedExp ? Math.max(1, Math.ceil((new Date(selectedExp).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) : 30
            }
          />
        </div>
      )}

      {expirations.length > 0 && activeTab === 'opportunities' && (
        <div className="animate-fade-in">
          <OpportunityDashboard
            quote={quote}
            chain={chain}
            expiration={selectedExp}
          />
        </div>
      )}

      {expirations.length > 0 && activeTab === 'arbitrage' && (
        <div className="animate-fade-in">
          <ArbitrageScanner
            chain={chain}
            underlyingPrice={quote?.price || 0}
          />
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="animate-fade-in">
          <LearningJournal />
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="animate-fade-in">
          <PortfolioScanner 
            currentUnderlyingPrice={quote ? quote.price : 0} 
            currentSymbol={quote ? quote.symbol : ''}
          />
        </div>
      )}

      {activeTab === 'backtest' && (
        <div className="animate-fade-in">
          <BacktestScanner />
        </div>
      )}

      {activeTab === 'datacenter' && (
        <div className="animate-fade-in">
          <DataCenter />
        </div>
      )}

      {activeTab === 'probability' && (
        <div className="animate-fade-in">
          <ProbabilityScanner quote={quote} chain={chain} expiration={selectedExp} />
        </div>
      )}

      {expirations.length > 0 && activeTab === 'trade-setups' && (
        <div className="animate-fade-in">
          <TradeSetups quote={quote} chain={chain} />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="animate-fade-in">
          <ActivityScanner quote={quote} chain={chain} />
        </div>
      )}
    </div>
  );
}
