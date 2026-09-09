import React, { useMemo } from 'react';
import { PortfolioGreeks, ConcentrationReport, RiskLevel } from '@/lib/portfolio/types';
import { calculateRiskProfile } from '@/lib/portfolio/risk';

interface PortfolioRiskProfileProps {
  greeks: PortfolioGreeks;
  concentration: ConcentrationReport;
  portfolioValue: number;
}

const getRiskColor = (level: RiskLevel) => {
  switch (level) {
    case 'LOW': return 'text-green-400 bg-green-900/30';
    case 'MODERATE': return 'text-blue-400 bg-blue-900/30';
    case 'HIGH': return 'text-yellow-400 bg-yellow-900/30';
    case 'CRITICAL': return 'text-red-400 bg-red-900/30';
    case 'INSUFFICIENT_DATA': return 'text-gray-400 bg-gray-900/30';
  }
};

const getRiskLabel = (level: RiskLevel) => level.replace('_', ' ');

export const PortfolioRiskProfile: React.FC<PortfolioRiskProfileProps> = ({ greeks, concentration, portfolioValue }) => {
  
  const profile = useMemo(() => calculateRiskProfile(greeks, concentration, portfolioValue), [greeks, concentration, portfolioValue]);

  const metrics = [
    { label: 'Directional Risk (Delta)', level: profile.directional, desc: 'Exposure to broad market movement' },
    { label: 'Convexity Risk (Gamma)', level: profile.convexity, desc: 'Sensitivity of Delta to market movement' },
    { label: 'Time Decay (Theta)', level: profile.timeDecay, desc: 'Daily impact of time passing' },
    { label: 'Volatility Risk (Vega)', level: profile.volatility, desc: 'Exposure to changes in implied volatility' },
    { label: 'Concentration Risk', level: profile.concentration, desc: 'Overexposure to a single underlying asset' }
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Portfolio Risk Profile</h2>
        <div className={`px-4 py-2 rounded-lg font-bold border ${getRiskColor(profile.overall)} border-current`}>
          OVERALL: {getRiskLabel(profile.overall)}
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map(metric => (
          <div key={metric.label} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
            <div>
              <div className="text-gray-200 font-semibold">{metric.label}</div>
              <div className="text-sm text-gray-500">{metric.desc}</div>
            </div>
            <div className={`px-3 py-1 rounded-md text-sm font-bold ${getRiskColor(metric.level)}`}>
              {getRiskLabel(metric.level)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 text-xs text-gray-500 border-t border-gray-700 pt-4">
        * Risk levels are calculated deterministically against portfolio net liquidation value. They do not represent AI predictions.
      </div>
    </div>
  );
};
