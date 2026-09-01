'use client';
import { useState } from 'react';
import { OptionContract } from '@/lib/providers/MarketDataProvider';
import OpportunityCard from './OpportunityCard';
import OpportunityDetail from './OpportunityDetail';
import WatchlistPanel from './WatchlistPanel';
import SnapshotPanel from './SnapshotPanel';
import MarketRegimePanel from './MarketRegimePanel';
import VolatilitySkewChart from './VolatilitySkewChart';
import { RankedOpportunity, rankOpportunities, StrategyCandidate, DEFAULT_THRESHOLDS, OpportunityFilter } from '@/lib/opportunityEngine';
import { analyzeStrategy } from '@/lib/payoffEngine';
import { calculateDaysToExpiration } from '@/lib/calculations';

interface OpportunityDashboardProps {
  quote: { symbol: string; price: number; change: number; changePercentage: number; volume: number } | null;
  chain: OptionContract[];
  expiration: string;
}

const STRATEGY_CONFIGS = [
  { name: 'Long Call', make: (chain: OptionContract[], price: number) => {
    const atm = chain.filter(c => c.type === 'call').sort((a, b) => Math.abs(a.strike - price) - Math.abs(b.strike - price))[0];
    if (!atm) return null;
    return { legs: [{ id: atm.symbol, type: 'call' as const, side: 'long' as const, strike: atm.strike, quantity: 1, entryPrice: (atm.bid + atm.ask) / 2, multiplier: 100 }], contracts: [atm] };
  }},
  { name: 'Long Put', make: (chain: OptionContract[], price: number) => {
    const atm = chain.filter(c => c.type === 'put').sort((a, b) => Math.abs(a.strike - price) - Math.abs(b.strike - price))[0];
    if (!atm) return null;
    return { legs: [{ id: atm.symbol, type: 'put' as const, side: 'long' as const, strike: atm.strike, quantity: 1, entryPrice: (atm.bid + atm.ask) / 2, multiplier: 100 }], contracts: [atm] };
  }},
  { name: 'Bull Call Spread', make: (chain: OptionContract[], price: number) => {
    const calls = chain.filter(c => c.type === 'call' && c.bid > 0 && c.ask > 0).sort((a, b) => a.strike - b.strike);
    const longIdx = calls.findIndex(c => c.strike >= price);
    if (longIdx < 0 || longIdx + 1 >= calls.length) return null;
    const long = calls[longIdx], short = calls[longIdx + 1];
    return {
      legs: [
        { id: long.symbol, type: 'call' as const, side: 'long' as const, strike: long.strike, quantity: 1, entryPrice: (long.bid + long.ask) / 2, multiplier: 100 },
        { id: short.symbol, type: 'call' as const, side: 'short' as const, strike: short.strike, quantity: 1, entryPrice: (short.bid + short.ask) / 2, multiplier: 100 }
      ],
      contracts: [long, short]
    };
  }},
  { name: 'Bear Put Spread', make: (chain: OptionContract[], price: number) => {
    const puts = chain.filter(c => c.type === 'put' && c.bid > 0 && c.ask > 0).sort((a, b) => a.strike - b.strike);
    const shortIdx = puts.findIndex(c => c.strike >= price);
    if (shortIdx <= 0) return null;
    const short = puts[shortIdx - 1], long = puts[shortIdx];
    return {
      legs: [
        { id: long.symbol, type: 'put' as const, side: 'long' as const, strike: long.strike, quantity: 1, entryPrice: (long.bid + long.ask) / 2, multiplier: 100 },
        { id: short.symbol, type: 'put' as const, side: 'short' as const, strike: short.strike, quantity: 1, entryPrice: (short.bid + short.ask) / 2, multiplier: 100 }
      ],
      contracts: [long, short]
    };
  }}
];

export default function OpportunityDashboard({ quote, chain, expiration }: OpportunityDashboardProps) {
  const [selectedOpp, setSelectedOpp] = useState<RankedOpportunity | null>(null);
  const [filter, setFilter] = useState<OpportunityFilter>({ qualityMode: 'all' });
  const [subView, setSubView] = useState<'opportunities' | 'watchlist' | 'snapshots'>('opportunities');

  if (!quote || chain.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h3>Opportunities</h3>
        <p className="text-muted">Search for a symbol and load an option chain to generate opportunity analysis.</p>
      </div>
    );
  }

  // Generate candidates from chain
  const dte = calculateDaysToExpiration(expiration) || 30;
  const candidates: StrategyCandidate[] = [];

  for (const cfg of STRATEGY_CONFIGS) {
    const result = cfg.make(chain, quote.price);
    if (!result) continue;
    const analysis = analyzeStrategy(result.legs, quote.price);
    if (!analysis) continue;
    candidates.push({
      underlying: quote.symbol,
      expiration,
      strategyName: cfg.name,
      legs: result.legs,
      contracts: result.contracts,
      strategyAnalysis: analysis,
      daysToExpiration: dte,
      totalContracts: 1
    });
  }

  const opportunities = rankOpportunities(candidates, DEFAULT_THRESHOLDS, filter);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
    border: 'none', borderRadius: '4px',
    backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
    color: active ? '#fff' : 'var(--text-primary)'
  });

  return (
    <div>
      <MarketRegimePanel quote={quote} chain={chain} />
      <VolatilitySkewChart chain={chain} underlyingPrice={quote.price} />

      {/* Sub-navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button style={tabStyle(subView === 'opportunities')} onClick={() => setSubView('opportunities')}>
          Ranked Opportunities ({opportunities.length})
        </button>
        <button style={tabStyle(subView === 'watchlist')} onClick={() => setSubView('watchlist')}>Watchlist</button>
        <button style={tabStyle(subView === 'snapshots')} onClick={() => setSubView('snapshots')}>Snapshots</button>
      </div>

      {/* Filter bar */}
      {subView === 'opportunities' && (
        <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Filter:</span>
          <button
            onClick={() => setFilter({ ...filter, qualityMode: 'all' })}
            style={{ ...tabStyle(filter.qualityMode === 'all'), padding: '4px 10px' }}
          >All</button>
          <button
            onClick={() => setFilter({ ...filter, qualityMode: 'high_quality' })}
            style={{ ...tabStyle(filter.qualityMode === 'high_quality'), padding: '4px 10px' }}
          >High Quality</button>
        </div>
      )}

      {subView === 'opportunities' && (
        selectedOpp ? (
          <OpportunityDetail opportunity={selectedOpp} onClose={() => setSelectedOpp(null)} />
        ) : (
          <>
            {opportunities.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p className="text-muted">No opportunities match current filters. Try switching to &quot;All&quot; mode.</p>
              </div>
            ) : (
              opportunities.map(opp => (
                <OpportunityCard key={opp.id} opportunity={opp} onSelect={() => setSelectedOpp(opp)} />
              ))
            )}
          </>
        )
      )}

      {subView === 'watchlist' && <WatchlistPanel />}
      {subView === 'snapshots' && <SnapshotPanel />}
    </div>
  );
}
