'use client';
import React, { useState, useMemo } from 'react';
import { MarketView, ScreeningFilters, StrategyCandidate, MarketDirection, TimeHorizon } from '../lib/screening/types';
import { generateCandidates } from '../lib/screening/engine';
import { OptionContract, Quote } from '../lib/providers/MarketDataProvider';

interface Props {
  quote: Quote | null;
  chain: OptionContract[];
}

export default function TradeSetups({ quote, chain }: Props) {
  const [marketView, setMarketView] = useState<MarketView>({
    direction: 'BULLISH',
    timeHorizon: 'MEDIUM',
    volatilityView: 'UNKNOWN',
    expectedMovement: 'MODERATE'
  });

  const [filters, setFilters] = useState<ScreeningFilters>({
    maxCapital: 5000,
    maxLoss: 1000,
    minDte: 14,
    maxDte: 45
  });

  const [selectedCandidate, setSelectedCandidate] = useState<StrategyCandidate | null>(null);

  const candidates = useMemo(() => {
    if (!quote || chain.length === 0 || quote.price === null) return [];
    return generateCandidates(chain, quote.price, marketView, filters);
  }, [quote, chain, marketView, filters]);

  return (
    <div style={{ padding: '1rem', display: 'flex', gap: '2rem' }}>
      <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px' }}>
        <h2>MY THESIS</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <label>Direction</label>
          <select 
            value={marketView.direction} 
            onChange={(e) => setMarketView({...marketView, direction: e.target.value as MarketDirection})}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          >
            <option>STRONGLY BULLISH</option>
            <option>BULLISH</option>
            <option>NEUTRAL</option>
            <option>BEARISH</option>
            <option>STRONGLY BEARISH</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Time Horizon</label>
          <select 
            value={marketView.timeHorizon} 
            onChange={(e) => setMarketView({...marketView, timeHorizon: e.target.value as TimeHorizon})}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          >
            <option>VERY SHORT</option>
            <option>SHORT</option>
            <option>MEDIUM</option>
            <option>LONG</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Max Capital ($)</label>
          <input 
            type="number" 
            value={filters.maxCapital} 
            onChange={(e) => setFilters({...filters, maxCapital: Number(e.target.value)})}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Max Loss ($)</label>
          <input 
            type="number" 
            value={filters.maxLoss} 
            onChange={(e) => setFilters({...filters, maxLoss: Number(e.target.value)})}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>

      </div>

      <div style={{ flex: 2 }}>
        <h2>MATCHING STRATEGIES</h2>
        {candidates.length === 0 ? (
          <p>No strategies found matching your criteria.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Strategy</th>
                <th style={{ padding: '12px' }}>Score</th>
                <th style={{ padding: '12px' }}>Capital</th>
                <th style={{ padding: '12px' }}>Max Loss</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.slice(0, 10).map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.strategyName}</td>
                  <td style={{ padding: '12px' }}>{c.scoreCard.totalScore} / 100</td>
                  <td style={{ padding: '12px' }}>${c.analysis.capitalRequired.toFixed(2)}</td>
                  <td style={{ padding: '12px' }}>{c.analysis.maxLoss ? `$${Math.abs(c.analysis.maxLoss).toFixed(2)}` : 'Undefined'}</td>
                  <td style={{ padding: '12px', color: c.matchStatus === 'MATCHES YOUR CRITERIA' ? 'var(--text-success)' : 'var(--text-warning)' }}>
                    {c.matchStatus}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button 
                      onClick={() => setSelectedCandidate(c)}
                      style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: 'var(--accent-primary)', border: 'none', color: '#fff', borderRadius: '4px' }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedCandidate && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '2rem', borderRadius: '8px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h2>EXPLAIN THIS SETUP</h2>
              <button onClick={() => setSelectedCandidate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '1.5rem' }}>✕</button>
            </div>
            
            <h3 style={{ marginTop: '1rem', color: 'var(--accent-primary)' }}>{selectedCandidate.strategyName}</h3>
            
            <div style={{ marginTop: '1rem' }}>
              <p><strong>Status:</strong> {selectedCandidate.matchStatus}</p>
              <p><strong>Score:</strong> {selectedCandidate.scoreCard.totalScore} / 100</p>
              <p><strong>Capital Required:</strong> ${selectedCandidate.analysis.capitalRequired.toFixed(2)}</p>
              <p><strong>Max Loss:</strong> {selectedCandidate.analysis.maxLoss ? `$${Math.abs(selectedCandidate.analysis.maxLoss).toFixed(2)}` : 'Undefined'}</p>
              <p><strong>Max Profit:</strong> {selectedCandidate.analysis.maxProfit ? `$${selectedCandidate.analysis.maxProfit.toFixed(2)}` : 'Infinite'}</p>
              <p><strong>Probability of Profit:</strong> {selectedCandidate.probabilityOfProfit ? `${selectedCandidate.probabilityOfProfit.toFixed(1)}% (MODEL ESTIMATE)` : 'INSUFFICIENT DATA'}</p>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h4>Why It Matches</h4>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                {selectedCandidate.matchExplanation.map((expl, i) => (
                  <li key={i}>{expl}</li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h4>Why It May Not Match</h4>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', color: 'var(--text-warning)' }}>
                {selectedCandidate.conflictExplanation.map((expl, i) => (
                  <li key={i}>{expl}</li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
