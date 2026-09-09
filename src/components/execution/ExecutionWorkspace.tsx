import React, { useState, useEffect } from 'react';
import { OrderTicket } from './OrderTicket';
import { PositionSizer } from './PositionSizer';
import { ExecutionChecklist } from './ExecutionChecklist';
import { TradePlan, PositionSizeResult } from '../../lib/execution/types';
import { getTradePlans, saveTradePlan, deleteTradePlan } from '../../lib/execution/tradePlanStore';
import { saveLivePosition } from '../../lib/positions/positionStore';
import { addJournalEntry, AdvancedJournalEntry } from '../../lib/store';

export function ExecutionWorkspace() {
  const [plans, setPlans] = useState<TradePlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showFillsModal, setShowFillsModal] = useState(false);
  const [fillPrices, setFillPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setPlans(getTradePlans());
    }, 0);
    return () => clearTimeout(timer);
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
    alert(`Suggested quantity: ${res.suggestedQuantity}. Max quantity allowed: ${res.maxQuantity}. Max loss: $${res.maxLoss}. Portfolio Impact: ${res.portfolioImpact}.`);
  };

  const activePlan = plans.find(p => p.id === activePlanId);

  const openFillsModal = () => {
    if (!activePlan) return;
    const initialFills: Record<string, string> = {};
    activePlan.legs.forEach(leg => {
      initialFills[leg.id] = activePlan.limitPrice.suggestedLimit?.toString() || '0.00';
    });
    setFillPrices(initialFills);
    setShowFillsModal(true);
  };

  const handleRecordFills = () => {
    if (!activePlan) return;
    
    const fills = activePlan.legs.map(leg => ({
      legId: leg.id,
      fillPrice: parseFloat(fillPrices[leg.id] || '0'),
      quantity: activePlan.quantity * leg.quantity,
      filledAt: Date.now()
    }));

    // 1. Create Live Position
    saveLivePosition({
      planId: activePlan.id,
      underlying: activePlan.underlying,
      status: 'OPEN',
      plan: activePlan,
      fills,
      enteredAt: Date.now(),
      closedAt: null,
      currentPnL: {
        unrealizedPnL: 0,
        realizedPnL: 0,
        returnOnCapital: 0,
        marginUtilization: activePlan.maxPlannedCapital || 0
      },
      currentGreeks: null,
      adjustmentRecommendation: null,
      upcomingEvents: []
    });

    // 2. Create Journal Entry using the plan's id as the journal id
    const journalEntry: Omit<AdvancedJournalEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      date: new Date().toISOString(),
      underlying: activePlan.underlying,
      strategy: activePlan.strategyName,
      direction: activePlan.direction,
      volatilityView: 'neutral',
      thesis: activePlan.thesis,
      expectedOutcome: `Target: $${activePlan.targetPrice}`,
      marketEvidence: {
        underlyingPriceAtEntry: 0, // Should be fetched from quote, simplified here
        notes: 'Recorded from Execution Planner'
      },
      checklist: {
        thesisMatchesMarket: true,
        riskDefined: true,
        capitalEfficient: true,
        liquidityChecked: true,
        earningsChecked: true
      },
      whatMustHappen: activePlan.entryCondition,
      whatCanGoWrong: 'Market reversal',
      invalidationRule: `Stop hit at ${activePlan.stopPrice}`,
      contracts: activePlan.quantity,
      entryPrice: fills.reduce((sum, fill) => sum + fill.fillPrice, 0), // Simplified net entry
      legs: activePlan.legs.map(l => ({
        type: (l.type === 'stock' ? 'call' : l.type) as 'call' | 'put',
        strike: l.strike,
        expiration: activePlan.expiration || '',
        action: l.side === 'long' ? 'buy' : 'sell',
        price: parseFloat(fillPrices[l.id] || '0')
      })),
      risk: `Max Loss: $${activePlan.maxPlannedLoss}`,
      status: 'open'
    };

    addJournalEntry(journalEntry);
    
    // We update the live position's plan ID to point to the journal entry so closing works seamlessly
    // In our code above `plan.id` is preserved from `activePlan`. But we could just link it.
    
    setShowFillsModal(false);
    alert('Position opened and synchronized with Trade Journal!');
    
    // Optional: Delete from execution plans
    deleteTradePlan(activePlan.id);
    setPlans(getTradePlans());
    setActivePlanId(null);
  };

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
            <button 
              onClick={openFillsModal}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded shadow-lg transition-colors"
            >
              Record Fills & Open Position
            </button>
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

      {/* Record Fills Modal */}
      {showFillsModal && activePlan && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="bg-slate-800 p-6 rounded shadow-2xl border border-slate-700 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-slate-100">Record Order Fills</h2>
            <p className="text-slate-400 text-sm mb-4">
              Enter the actual fill prices you received from your broker to transition this plan into a Live Position.
            </p>
            
            <div className="space-y-4 mb-6">
              {activePlan.legs.map(leg => (
                <div key={leg.id} className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200">{leg.side.toUpperCase()} {leg.quantity}x</span>
                    <span className="text-slate-400 ml-2">{leg.strike} {leg.type}</span>
                  </div>
                  <div>
                    <input 
                      type="number"
                      step="0.01"
                      value={fillPrices[leg.id]}
                      onChange={(e) => setFillPrices({...fillPrices, [leg.id]: e.target.value})}
                      className="bg-slate-900 border border-slate-600 rounded p-2 text-slate-100 w-24 text-right"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowFillsModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleRecordFills}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded"
              >
                Confirm & Open Position
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
