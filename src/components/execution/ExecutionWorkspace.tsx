import React, { useState, useEffect } from 'react';
import { OrderTicket } from './OrderTicket';
import { PositionSizer } from './PositionSizer';
import { ExecutionChecklist } from './ExecutionChecklist';
import { TradePlan, PositionSizeResult } from '@/lib/execution/types';
import { getTradePlans, saveTradePlan, deleteTradePlan } from '@/lib/execution/tradePlanStore';

export function ExecutionWorkspace() {
  const [plans, setPlans] = useState<TradePlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  useEffect(() => {
    setPlans(getTradePlans());
  }, []);

  const handleCreateMockPlan = () => {
    const mockPlan: Omit<TradePlan, 'id' | 'timestamp'> = {
      underlying: 'AAPL',
      strategyName: 'Long Call',
      direction: 'bullish',
      thesis: 'Riding momentum pre-earnings.',
      entryCondition: 'Wait for pullback to $145',
      targetPrice: 155,
      stopPrice: 140,
      expiration: '2026-10-15',
      maxPlannedLoss: 500,
      maxPlannedCapital: 500,
      quantity: 2,
      legs: [
        { id: '1', type: 'call', side: 'long', strike: 150, quantity: 1, entryPrice: 0, multiplier: 100 }
      ],
      limitPrice: {
        bid: 1.05,
        ask: 1.15,
        midpoint: 1.10,
        theoretical: 1.10,
        suggestedLimit: 1.10,
        acceptableRange: [1.05, 1.15],
        debitOrCredit: 'DEBIT'
      },
      slippage: {
        estimatedSlippage: 0.05,
        liquidityPenalty: 0,
        totalExecutionCost: 0.05,
        breakEvenImpact: 0.05
      },
      executionQuality: 'READY',
      executionReasons: ['Market conditions are favorable for execution.'],
      checklist: [
        { category: 'MARKET', label: 'Market conditions acceptable', status: 'PASS' },
        { category: 'RISK', label: 'Position size defined', status: 'PASS' },
        { category: 'STRATEGY', label: 'Directional bias aligned (bullish)', status: 'PASS' },
        { category: 'EXECUTION', label: 'Limit price defined (1.10)', status: 'PASS' },
        { category: 'EXECUTION', label: 'Exit conditions defined', status: 'PASS' }
      ],
      educationalNote: 'The ask is what sellers are currently requesting. Buying at the midpoint helps reduce slippage.'
    };
    
    const newPlan = saveTradePlan(mockPlan);
    setPlans(getTradePlans());
    setActivePlanId(newPlan.id);
  };

  const handleUpdateSizing = (res: PositionSizeResult) => {
    // In a real app, this would update the active plan's quantity and re-save
    alert(`Suggested quantity: ${res.suggestedQuantity}. Max quantity allowed: ${res.maxQuantity}. Max loss: $${res.maxLoss}. Portfolio Impact: ${res.portfolioImpact}.`);
  };

  const activePlan = plans.find(p => p.id === activePlanId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Trade Execution Intelligence</h1>
        <button 
          onClick={handleCreateMockPlan}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          + Draft New Plan
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded p-4 flex gap-4 overflow-x-auto">
        {plans.length === 0 ? (
          <p className="text-slate-400">No saved trade plans. Draft a new one.</p>
        ) : (
          plans.map(plan => (
            <div 
              key={plan.id}
              onClick={() => setActivePlanId(plan.id)}
              className={`p-3 min-w-[200px] border rounded cursor-pointer transition-colors ${activePlanId === plan.id ? 'bg-indigo-900 border-indigo-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
            >
              <div className="flex justify-between mb-1">
                <span className="font-bold text-slate-100">{plan.underlying}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${plan.executionQuality === 'READY' ? 'bg-emerald-600' : 'bg-amber-600'} text-white`}>
                  {plan.executionQuality}
                </span>
              </div>
              <div className="text-sm text-slate-400">{plan.strategyName}</div>
              <div className="text-xs text-slate-500 mt-2">{new Date(plan.timestamp).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      {activePlan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <OrderTicket plan={activePlan} />
            <PositionSizer analysis={null} onSizingUpdate={handleUpdateSizing} />
          </div>
          
          <div className="lg:col-span-2 space-y-6">
            <ExecutionChecklist checklist={activePlan.checklist} />
            
            {activePlan.educationalNote && (
              <div className="bg-slate-900 border border-indigo-500/30 rounded p-4 shadow-xl">
                <h3 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                  <span>🎓</span> Execution Intelligence
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {activePlan.educationalNote}
                </p>
              </div>
            )}
            
            <div className="bg-slate-900 border border-slate-700 rounded p-4 shadow-xl">
              <h3 className="text-slate-100 font-bold mb-4">Slippage & Cost Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-3 rounded">
                  <div className="text-slate-400 text-xs mb-1">Est. Slippage</div>
                  <div className="text-slate-100 font-bold">${activePlan.slippage.estimatedSlippage?.toFixed(2) || 'N/A'}</div>
                </div>
                <div className="bg-slate-800 p-3 rounded">
                  <div className="text-slate-400 text-xs mb-1">Liquidity Penalty</div>
                  <div className="text-slate-100 font-bold">${activePlan.slippage.liquidityPenalty?.toFixed(2) || 'N/A'}</div>
                </div>
                <div className="bg-slate-800 p-3 rounded">
                  <div className="text-slate-400 text-xs mb-1">Total Cost</div>
                  <div className="text-slate-100 font-bold text-amber-400">${activePlan.slippage.totalExecutionCost?.toFixed(2) || 'N/A'}</div>
                </div>
                <div className="bg-slate-800 p-3 rounded">
                  <div className="text-slate-400 text-xs mb-1">Break-Even Impact</div>
                  <div className="text-slate-100 font-bold">${activePlan.slippage.breakEvenImpact?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button 
                onClick={() => {
                  deleteTradePlan(activePlan.id);
                  setPlans(getTradePlans());
                  setActivePlanId(null);
                }}
                className="text-red-400 hover:text-red-300 text-sm font-bold transition-colors"
              >
                Delete Trade Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
