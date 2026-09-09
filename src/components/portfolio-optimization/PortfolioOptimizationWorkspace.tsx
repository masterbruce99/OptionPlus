import React, { useState, useEffect } from 'react';
import { PortfolioPosition } from '@/lib/portfolio/types';
import { aggregatePortfolioGreeks, analyzeConcentration } from '@/lib/portfolio/engine';
import { OptionChain } from '@/lib/data-infrastructure/types';
import { OptionContract } from '@/lib/providers/MarketDataProvider';
import { PortfolioRiskProfile } from './PortfolioRiskProfile';
import { PortfolioLimits } from './PortfolioLimits';
import { HedgeAnalysisPanel } from './HedgeAnalysisPanel';
import { WhatIfPortfolio } from './WhatIfPortfolio';
import { PortfolioStressTest } from './PortfolioStressTest';

interface PortfolioOptimizationWorkspaceProps {
  positions: PortfolioPosition[];
  portfolioValue: number;
}

export const PortfolioOptimizationWorkspace: React.FC<PortfolioOptimizationWorkspaceProps> = ({ positions, portfolioValue }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'HEDGING' | 'WHAT_IF' | 'STRESS'>('OVERVIEW');
  const [chain, setChain] = useState<OptionChain | null>(null); // Mock chain for now, could be fetched via provider

  const greeks = aggregatePortfolioGreeks(positions);
  const concentration = analyzeConcentration(positions);

  // Derive an assumed underlying price from the first long equity position if available, else 150
  const underlyingPrice = positions.find(p => p.type === 'stock')?.currentLast || 
                          positions.find(p => p.type === 'stock')?.entryPrice || 
                          150;

  useEffect(() => {
    // Generate a synthetic mock chain for demonstration purposes, to allow hedge calculation
    // In production, this would use DefaultHistoricalProvider to fetch an actual option chain
    const timer = setTimeout(() => {
      setChain({
        symbol: positions.length > 0 ? positions[0].underlying : 'AAPL',
        currentPrice: underlyingPrice,
        expirations: [
          {
            date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 DTE
            daysToExpiration: 30,
            strikes: [
              {
                strike: underlyingPrice, // ATM
                call: { symbol: 'MOCK_C', underlying: 'AAPL', expiration: '2026-10-01', strike: underlyingPrice, type: 'call', last: 5.0, bid: 5.0, ask: 5.1, volume: 100, openInterest: 500, impliedVolatility: 0.25, greeks: { delta: 0.5, gamma: 0.05, theta: -0.05, vega: 0.1, rho: 0.01 } } as unknown as OptionContract,
                put: { symbol: 'MOCK_P', underlying: 'AAPL', expiration: '2026-10-01', strike: underlyingPrice, type: 'put', last: 5.0, bid: 5.0, ask: 5.1, volume: 100, openInterest: 500, impliedVolatility: 0.25, greeks: { delta: -0.5, gamma: 0.05, theta: -0.05, vega: 0.1, rho: -0.01 } } as unknown as OptionContract
              }
            ]
          }
        ]
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [underlyingPrice, positions]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-gray-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Portfolio Optimization</h1>
          <p className="text-gray-400 mt-1">Advanced risk management, hedging, and stress testing</p>
        </div>
        
        <div className="flex gap-2">
          {['OVERVIEW', 'HEDGING', 'WHAT_IF', 'STRESS'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'OVERVIEW' | 'HEDGING' | 'WHAT_IF' | 'STRESS')}
              className={`px-4 py-2 rounded-t-lg font-bold transition-colors ${
                activeTab === tab ? 'bg-gray-800 text-blue-400 border-t-2 border-blue-500' : 'bg-gray-900 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 p-2 rounded-b-lg">
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PortfolioRiskProfile 
              greeks={greeks} 
              concentration={concentration} 
              portfolioValue={portfolioValue} 
            />
            <PortfolioLimits 
              positions={positions} 
              greeks={greeks} 
              concentration={concentration} 
            />
          </div>
        )}

        {activeTab === 'HEDGING' && (
          <HedgeAnalysisPanel 
            greeks={greeks}
            underlyingPrice={underlyingPrice}
            chain={chain}
          />
        )}

        {activeTab === 'WHAT_IF' && (
          <WhatIfPortfolio 
            basePositions={positions}
          />
        )}

        {activeTab === 'STRESS' && (
          <PortfolioStressTest 
            greeks={greeks}
            portfolioValue={portfolioValue}
          />
        )}
      </div>
    </div>
  );
};
