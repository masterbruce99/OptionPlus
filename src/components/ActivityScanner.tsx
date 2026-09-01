import React, { useState, useMemo } from 'react';
import { Quote, OptionContract } from '../lib/providers/MarketDataProvider';
import { analyzeActivity } from '../lib/activity/engine';

interface ActivityScannerProps {
  quote: Quote | null;
  chain: OptionContract[];
}

export function ActivityScanner({ quote, chain }: ActivityScannerProps) {
  const [minVolume, setMinVolume] = useState(100);
  const [minPremium, setMinPremium] = useState(10000);
  const [minScore, setMinScore] = useState(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    if (!quote || chain.length === 0) return [];
    return analyzeActivity(chain, quote, {
      minVolume,
      minPremium,
      minActivityScore: minScore
    });
  }, [chain, quote, minVolume, minPremium, minScore]);

  if (!quote) {
    return <div className="p-4 text-gray-500">Waiting for market data...</div>;
  }

  const formatCurrency = (val: number | null) => {
    if (val === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'HIGHLY UNUSUAL ACTIVITY': return 'bg-red-900/40 text-red-400 border border-red-800';
      case 'UNUSUAL ACTIVITY': return 'bg-orange-900/40 text-orange-400 border border-orange-800';
      case 'ELEVATED ACTIVITY': return 'bg-yellow-900/40 text-yellow-400 border border-yellow-800';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">OPTIONS ACTIVITY SCANNER</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Minimum Volume</label>
            <input 
              type="number" 
              value={minVolume} 
              onChange={e => setMinVolume(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Minimum Premium ($)</label>
            <input 
              type="number" 
              value={minPremium} 
              onChange={e => setMinPremium(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Minimum Score</label>
            <input 
              type="number" 
              value={minScore} 
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Contract</th>
                <th className="p-3">Score</th>
                <th className="p-3">Classification</th>
                <th className="p-3">Volume</th>
                <th className="p-3">OI</th>
                <th className="p-3">Vol/OI</th>
                <th className="p-3">Agg. Premium</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No unusual activity matches current filters.
                  </td>
                </tr>
              ) : (
                candidates.map((c, idx) => {
                  const id = c.contract.symbol;
                  const isExpanded = expandedId === id;
                  return (
                    <React.Fragment key={id}>
                      <tr className="hover:bg-slate-800/50">
                        <td className="p-3 font-mono">#{idx + 1}</td>
                        <td className="p-3 font-mono">
                          {c.contract.underlying} {c.contract.expiration} ${c.contract.strike} {c.contract.type.toUpperCase()}
                        </td>
                        <td className="p-3 font-bold">{c.activityScore}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${getClassificationColor(c.classification)}`}>
                            {c.classification}
                          </span>
                        </td>
                        <td className="p-3">{c.totalVolume}</td>
                        <td className="p-3">{c.openInterest}</td>
                        <td className="p-3">{c.volumeToOiRatio.toFixed(2)}x</td>
                        <td className="p-3">{formatCurrency(c.aggregateNotionalPremium)}</td>
                        <td className="p-3">
                          <button 
                            onClick={() => setExpandedId(isExpanded ? null : id)}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            {isExpanded ? 'HIDE' : 'DETAIL'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-0 border-b border-slate-700 bg-slate-800/20">
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                              
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Why It Was Flagged</h4>
                                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                                    {c.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                  </ul>
                                </div>
                                
                                <div className="bg-slate-800 rounded p-3 border border-slate-700">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data Quality & Missing Data</h4>
                                  <div className="text-xs text-slate-400 space-y-1">
                                    <p>Score: {c.dataQualityScore}/100</p>
                                    {Object.entries(c.flags).map(([key, val]) => (
                                      <p key={key}>
                                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>: 
                                        <span className="text-orange-400 ml-2">{val}</span>
                                      </p>
                                    ))}
                                    <p className="mt-2 text-slate-500 italic">
                                      * The Tradier provider supplies aggregated daily volume, not tick-level executions. 
                                      Therefore, individual large block trades, sweeps, and exact bid/ask cross executions cannot be deterministically verified.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="bg-blue-900/20 border border-blue-900 rounded p-4">
                                  <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2">What This Means</h4>
                                  <p className="text-slate-300 text-sm leading-relaxed">
                                    There is elevated trading activity in this specific contract compared to the existing open interest and normal baseline. 
                                    This indicates heightened interest or positioning at this strike and expiration.
                                  </p>
                                </div>
                                
                                <div className="bg-red-900/20 border border-red-900 rounded p-4">
                                  <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">What This Does NOT Prove</h4>
                                  <p className="text-slate-300 text-sm leading-relaxed">
                                    Unusual options activity does NOT prove that a trader is bullish, bearish, informed, institutional, or acting on inside information. 
                                    Multiple strategies (including hedges, spreads, and closing transactions) can produce similar aggregate volume profiles. 
                                    Never blindly mirror unusual activity.
                                  </p>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
