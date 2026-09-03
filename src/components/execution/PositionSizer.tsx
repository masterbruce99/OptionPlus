import React, { useState } from 'react';
import { SizingConstraints, calculatePositionSize } from '@/lib/execution/positionSizer';
import { StrategyAnalysis } from '@/lib/payoffEngine';
import { PositionSizeResult } from '@/lib/execution/types';

interface PositionSizerProps {
  analysis: StrategyAnalysis | null;
  onSizingUpdate: (result: PositionSizeResult) => void;
}

export function PositionSizer({ analysis, onSizingUpdate }: PositionSizerProps) {
  const [maxRisk, setMaxRisk] = useState<string>('');
  const [maxCapital, setMaxCapital] = useState<string>('');

  const handleCalculate = () => {
    if (!analysis) return;

    const riskVal = maxRisk ? parseFloat(maxRisk) : null;
    const capVal = maxCapital ? parseFloat(maxCapital) : null;

    const constraints: SizingConstraints = {
      maxDollarRisk: riskVal && !isNaN(riskVal) ? riskVal : null,
      maxCapitalAllocation: capVal && !isNaN(capVal) ? capVal : null,
      portfolioRiskLimit: null
    };

    const result = calculatePositionSize(analysis, constraints);
    onSizingUpdate(result);
  };

  return (
    <div className="bg-slate-800 p-4 rounded border border-slate-700">
      <h3 className="text-lg font-bold text-slate-100 mb-4">Position Sizer</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Max Dollar Risk ($)</label>
          <input
            type="number"
            value={maxRisk}
            onChange={(e) => setMaxRisk(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-100"
            placeholder="e.g. 500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Max Capital Allocation ($)</label>
          <input
            type="number"
            value={maxCapital}
            onChange={(e) => setMaxCapital(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-100"
            placeholder="e.g. 2000"
          />
        </div>
      </div>
      <button
        onClick={handleCalculate}
        disabled={!analysis}
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
      >
        Calculate Suggested Size
      </button>
    </div>
  );
}
