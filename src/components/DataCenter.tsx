'use client';

import React from 'react';
import { CapabilityMetadata } from '../lib/data-infrastructure/types';

export function DataCenter() {
  
  // Dummy data representing the default unconfigured provider
  const capabilities: CapabilityMetadata = {
    underlyingHistory: 'NOT_SUPPORTED',
    optionContracts: 'NOT_SUPPORTED',
    optionQuotes: 'NOT_SUPPORTED',
    optionTrades: 'NOT_SUPPORTED',
    bidAsk: 'NOT_SUPPORTED',
    volume: 'NOT_SUPPORTED',
    openInterest: 'NOT_SUPPORTED',
    impliedVolatility: 'NOT_SUPPORTED',
    greeks: 'NOT_SUPPORTED',
    dividends: 'NOT_SUPPORTED',
    interestRates: 'NOT_SUPPORTED'
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-4 text-[var(--accent-primary)]">Data Center (Phase 7 Infrastructure)</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          This module manages historical market data integration for options backtesting and quantitative analysis.
        </p>
        
        <div className="bg-[var(--bg-tertiary)] p-4 rounded border border-[var(--border-color)]">
          <h3 className="font-bold mb-2">Provider Status</h3>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="font-mono text-sm">PROVIDER NOT CONFIGURED</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            The standard real-time provider does not offer historical options chains. A premium historical provider (e.g. Polygon, Databento) must be configured to run backtests.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data Availability Matrix */}
        <div className="card">
          <h3 className="text-lg font-bold mb-3 border-b border-[var(--border-color)] pb-2">Data Availability Matrix</h3>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(capabilities).map(([key, status]) => (
                <tr key={key} className="border-b border-[var(--border-color)] last:border-0">
                  <td className="py-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                  <td className="py-2 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      status === 'AVAILABLE' ? 'bg-green-900 text-green-300' :
                      status === 'PARTIAL' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Backtest Readiness */}
        <div className="card">
          <h3 className="text-lg font-bold mb-3 border-b border-[var(--border-color)] pb-2">Backtest Readiness</h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-red-900 text-red-300 text-sm font-bold rounded">NOT READY</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Historical option bid/ask data is unavailable. The backtest engine cannot process simulations without verifiable point-in-time quotes.
          </p>

          <h3 className="text-lg font-bold mt-6 mb-3 border-b border-[var(--border-color)] pb-2">Cache Status</h3>
          <p className="text-sm text-[var(--text-muted)] italic">No datasets currently cached.</p>
        </div>
      </div>

      {/* Learning Mode */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4 text-[var(--accent-secondary)]">Learning Mode: Quantitative Data Pitfalls</h3>
        <div className="space-y-4">
          
          <div className="p-3 bg-[var(--bg-tertiary)] rounded">
            <h4 className="font-bold text-sm">Survivorship Bias</h4>
            <p className="text-sm mt-1"><strong>Plain English:</strong> Testing strategies only on companies/options that survived to the present day.</p>
            <p className="text-sm text-red-400 mt-1"><strong>Common Mistake:</strong> Excluding options that expired worthless or were delisted, artificially inflating backtest win rates.</p>
          </div>

          <div className="p-3 bg-[var(--bg-tertiary)] rounded">
            <h4 className="font-bold text-sm">Look-Ahead Bias</h4>
            <p className="text-sm mt-1"><strong>Plain English:</strong> Using information that was not actually known at the historical moment of the trade.</p>
            <p className="text-sm text-red-400 mt-1"><strong>Common Mistake:</strong> Using EOD closing prices to simulate an intraday entry, or using tomorrow&apos;s implied volatility.</p>
          </div>

          <div className="p-3 bg-[var(--bg-tertiary)] rounded">
            <h4 className="font-bold text-sm">Quote Reconstruction</h4>
            <p className="text-sm mt-1"><strong>Plain English:</strong> Identifying exactly which option contracts were listed and tradable at a historical second.</p>
            <p className="text-sm text-red-400 mt-1"><strong>Common Mistake:</strong> Taking today&apos;s option chain and assuming the exact same strikes existed 6 months ago.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
