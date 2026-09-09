import React, { useMemo, useState } from 'react';
import { PortfolioGreeks } from '@/lib/portfolio/types';


interface PortfolioStressTestProps {
  greeks: PortfolioGreeks;
  portfolioValue: number;
}

export const PortfolioStressTest: React.FC<PortfolioStressTestProps> = ({ greeks, portfolioValue }) => {
  const [ivShock, setIvShock] = useState<number>(0);
  
  const scenarios = useMemo(() => {
    const results = [];
    const priceChanges = [-0.20, -0.10, -0.05, 0, 0.05, 0.10, 0.20];
    const ivChanges = [-20, -10, 0, 10, 20];
    
    for (const pChange of priceChanges) {
      for (const iv of ivChanges) {
        const deltaPnL = greeks.dollarDelta * pChange;
        const gammaPnL = 0.5 * greeks.dollarGamma * (pChange * pChange);
        const vegaPnL = greeks.dollarVega * iv;
        
        results.push({
          priceChange: pChange,
          ivChange: iv,
          projectedPnL: deltaPnL + gammaPnL + vegaPnL,
        });
      }
    }
    return results;
  }, [greeks]);

  // Filter scenarios for the selected IV shock
  const filteredScenarios = scenarios.filter(s => s.ivChange === ivShock);

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-6">Portfolio Stress Test</h2>
      
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-semibold text-gray-300">IV Shock Assumption:</label>
        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
          {[-20, -10, 0, 10, 20].map(iv => (
            <button
              key={iv}
              onClick={() => setIvShock(iv)}
              className={`px-3 py-1 text-sm rounded ${ivShock === iv ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              {iv > 0 ? '+' : ''}{iv}%
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-3 px-4 text-sm font-semibold text-gray-400">Market Move</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-400">Projected P&L</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-400">% Impact</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredScenarios.map((s, i) => {
              const pctImpact = portfolioValue > 0 ? (s.projectedPnL / portfolioValue) * 100 : 0;
              let status = 'NORMAL';
              let statusColor = 'text-green-400';
              
              if (pctImpact < -10) {
                status = 'SEVERE LOSS';
                statusColor = 'text-red-500';
              } else if (pctImpact < -5) {
                status = 'WARNING';
                statusColor = 'text-yellow-500';
              } else if (pctImpact > 10) {
                status = 'LARGE GAIN';
                statusColor = 'text-green-500';
              }

              return (
                <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-750">
                  <td className="py-3 px-4 font-mono text-gray-300">
                    {s.priceChange > 0 ? '+' : ''}{(s.priceChange * 100).toFixed(0)}%
                  </td>
                  <td className={`py-3 px-4 font-mono font-bold ${s.projectedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(s.projectedPnL).toFixed(0)} {s.projectedPnL >= 0 ? 'Gain' : 'Loss'}
                  </td>
                  <td className="py-3 px-4 text-gray-300 font-mono">
                    {pctImpact > 0 ? '+' : ''}{pctImpact.toFixed(2)}%
                  </td>
                  <td className={`py-3 px-4 font-bold ${statusColor}`}>
                    {status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500 border-t border-gray-700 pt-4">
        * Scenarios approximate P&L using a Taylor series expansion of Portfolio Greeks (Delta, Gamma, Vega). Does not account for precise non-linear pricing of deep OTM/ITM shifts.
      </div>
    </div>
  );
};
