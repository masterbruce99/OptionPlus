'use client';
import React from 'react';
import { OptionContract } from '../../lib/providers/MarketDataProvider';
import { ActivityScanner } from '../ActivityScanner';
import OptionChainTable from '../OptionChainTable';
import { ChainIntelligence } from '../chain-intelligence/ChainIntelligence';
import VolatilitySkewChart from '../VolatilitySkewChart';
import ProbabilityScanner from '../ProbabilityScanner';
import ArbitrageScanner from '../ArbitrageScanner';
import TradeSetups from '../TradeSetups';
import { PortfolioScanner } from '../PortfolioScanner';
import { TradeEntryForm } from '../journal/TradeEntryForm';

interface TradeWorkspaceProps {
  quote: { price: number; change: number; changePercentage: number; volume: number; symbol: string } | null;
  chain: OptionContract[];
  expirations: string[];
  selectedExp: string;
  onExpChange: (exp: string) => void;
}

export function TradeWorkspace({ quote, chain, expirations, selectedExp, onExpChange }: TradeWorkspaceProps) {
  if (!quote) {
    return (
      <div className="card text-center" style={{ padding: '3rem' }}>
        <p className="text-muted">Search for a symbol above to start the Trade Intelligence Workflow.</p>
      </div>
    );
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: '2rem',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    background: 'var(--bg-secondary)',
    overflow: 'hidden'
  };

  const headerStyle: React.CSSProperties = {
    padding: '1rem',
    background: 'var(--bg-tertiary)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(to right, var(--bg-tertiary), var(--bg-secondary))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>TRADE INTELLIGENCE WORKSPACE</h2>
            <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>Single-symbol analysis and decision workflow</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, color: 'var(--accent-primary)' }}>{quote.symbol}</h3>
            <span style={{ fontSize: '0.9rem' }}>${quote.price.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 1. Market & Activity */}
      <div style={sectionStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0 }}>1. Market Context & Flow</h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <ActivityScanner quote={quote} chain={chain} />
        </div>
      </div>

      {/* 2. Chain & Volatility */}
      <div style={sectionStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0 }}>2. Chain & Volatility Intelligence</h3>
          <select 
            value={selectedExp} 
            onChange={(e) => onExpChange(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            {expirations.map(exp => (
              <option key={exp} value={exp}>{exp}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem' }}>
          <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <OptionChainTable 
              chain={chain} 
              underlyingPrice={quote.price}
              isBeginnerMode={false}
              onSelectOption={() => {}} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card" style={{ margin: 0 }}>
              <VolatilitySkewChart chain={chain} underlyingPrice={quote.price} />
            </div>
            <div className="card" style={{ margin: 0, flex: 1, overflowY: 'auto' }}>
              <ChainIntelligence 
                symbol={quote.symbol}
                chain={chain}
                expirations={expirations}
                underlyingPrice={quote.price}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Probability & Arbitrage */}
      <div style={sectionStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0 }}>3. Edge & Probability</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem' }}>
          <div>
            <ProbabilityScanner quote={quote} chain={chain} expiration={selectedExp} />
          </div>
          <div>
            <ArbitrageScanner chain={chain} underlyingPrice={quote.price} />
          </div>
        </div>
      </div>

      {/* 4. Trade Setups */}
      <div style={sectionStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0 }}>4. Strategy Generation</h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <TradeSetups quote={quote} chain={chain} />
        </div>
      </div>

      {/* 5. Action & Journal */}
      <div style={sectionStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0 }}>5. Portfolio Impact & Decision</h3>
        </div>
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ margin: 0 }}>
            <PortfolioScanner currentUnderlyingPrice={quote.price} currentSymbol={quote.symbol} />
          </div>
          <div className="card" style={{ margin: 0, borderTop: '4px solid var(--accent-primary)' }}>
            <h3 style={{ marginTop: 0 }}>Record Trade Decision</h3>
            <TradeEntryForm 
              initialSymbol={quote.symbol} 
              initialPrice={quote.price} 
              onSaved={() => alert('Decision Logged Successfully!')} 
            />
          </div>
        </div>
      </div>

    </div>
  );
}
