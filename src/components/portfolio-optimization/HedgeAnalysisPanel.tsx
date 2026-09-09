import React, { useState } from 'react';
import { PortfolioGreeks } from '@/lib/portfolio/types';
import { OptionChain } from '@/lib/data-infrastructure/types';
import { calculateHedgeRequirement, generateHedgeCandidates, compareHedges, RiskMetric } from '@/lib/portfolio/hedgingEngine';
import { saveHedgePlan } from '@/lib/portfolio/hedgePlan';

interface HedgeAnalysisPanelProps {
  greeks: PortfolioGreeks;
  underlyingPrice: number;
  chain: OptionChain | null;
}

export const HedgeAnalysisPanel: React.FC<HedgeAnalysisPanelProps> = ({ greeks, underlyingPrice, chain }) => {
  const [metric, setMetric] = useState<RiskMetric>('DELTA');
  const [target, setTarget] = useState<number>(0);
  
  const requirement = calculateHedgeRequirement(greeks, metric, target);
  const candidates = generateHedgeCandidates(requirement, underlyingPrice, chain);
  const comparisons = compareHedges(greeks, candidates, chain, underlyingPrice);

  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

  const handleSavePlan = () => {
    const candidate = candidates.find(c => c.id === selectedCandidate);
    if (candidate) {
      saveHedgePlan({
        metricTargeted: metric,
        portfolioState: greeks,
        selectedCandidate: candidate,
        estimatedCost: candidate.estimatedCost,
        expectedResidualRisk: candidate.residualRisk,
        status: 'DRAFT',
        notes: `Generated targeting ${target} ${metric}`
      });
      alert('Hedge plan saved to draft!');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-6">Hedge Candidate Analysis</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="p-4 bg-gray-900/50 rounded border border-gray-700">
          <label className="block text-sm text-gray-400 mb-2">Target Metric</label>
          <select 
            value={metric}
            onChange={(e) => setMetric(e.target.value as RiskMetric)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
          >
            <option value="DELTA">Dollar Delta</option>
            <option value="GAMMA" disabled>Dollar Gamma (Coming Soon)</option>
            <option value="THETA" disabled>Dollar Theta (Coming Soon)</option>
            <option value="VEGA" disabled>Dollar Vega (Coming Soon)</option>
          </select>
        </div>
        
        <div className="p-4 bg-gray-900/50 rounded border border-gray-700">
          <label className="block text-sm text-gray-400 mb-2">Target Exposure</label>
          <input 
            type="number" 
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
          />
        </div>

        <div className="p-4 bg-blue-900/20 rounded border border-blue-800">
          <div className="text-sm text-blue-400 mb-1">Current Exposure</div>
          <div className="text-2xl font-bold text-white">
            {metric === 'DELTA' ? `$${greeks.dollarDelta.toFixed(0)}` : 'N/A'}
          </div>
          <div className="text-sm text-gray-400 mt-2">{requirement.description}</div>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="text-center p-8 bg-gray-900/30 rounded border border-gray-700 text-gray-400">
          No hedge candidates found. 
          {!chain && " (Option chain data is missing)"}
          {requirement.requiredChange === 0 && " (Target is already met)"}
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-200">Generated Hedge Candidates</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {comparisons.map(comp => {
              const isSelected = selectedCandidate === comp.candidateId;
              const c = candidates.find(x => x.id === comp.candidateId);
              
              return (
                <div 
                  key={comp.candidateId}
                  onClick={() => setSelectedCandidate(comp.candidateId)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-900/50 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-bold text-white text-lg">{comp.candidateDescription}</div>
                      <div className="text-sm text-gray-400">{c?.instrumentType} Hedge</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Estimated Cost</div>
                      <div className={`font-mono font-bold ${comp.estimatedCost && comp.estimatedCost > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {comp.estimatedCost !== null ? `$${Math.abs(comp.estimatedCost).toFixed(2)} ${comp.estimatedCost > 0 ? 'Debit' : 'Credit'}` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-xs text-gray-500 mb-1">Delta After</div>
                      <div className="font-mono text-white">${comp.deltaAfter.toFixed(0)}</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-xs text-gray-500 mb-1">Gamma After</div>
                      <div className="font-mono text-white">${comp.gammaAfter.toFixed(0)}</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-xs text-gray-500 mb-1">Theta After</div>
                      <div className="font-mono text-white">${comp.thetaAfter.toFixed(0)}</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-xs text-gray-500 mb-1">Vega After</div>
                      <div className="font-mono text-white">${comp.vegaAfter.toFixed(0)}</div>
                    </div>
                  </div>

                  {c && (
                    <div className="text-sm text-blue-300 bg-blue-900/20 p-3 rounded flex items-start gap-2">
                      <span className="text-blue-400 font-bold">i</span>
                      <div>
                        <div className="font-semibold mb-1">Mathematical Basis</div>
                        <div>{c.mathematicalBasis}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              disabled={!selectedCandidate}
              onClick={handleSavePlan}
              className={`px-6 py-3 rounded-lg font-bold shadow-lg transition-colors ${
                selectedCandidate ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Draft Hedge Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
