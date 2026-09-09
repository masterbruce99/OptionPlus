import React, { useState } from 'react';
import { PortfolioPosition } from '@/lib/portfolio/types';
import { HypotheticalPosition, simulatePortfolio } from '@/lib/portfolio/simulatorEngine';

interface WhatIfPortfolioProps {
  basePositions: PortfolioPosition[];
}

export const WhatIfPortfolio: React.FC<WhatIfPortfolioProps> = ({ basePositions }) => {
  const [hypotheticalPositions, setHypotheticalPositions] = useState<HypotheticalPosition[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newDelta, setNewDelta] = useState<number>(0);
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [newPrice, setNewPrice] = useState<number>(100);

  const handleAdd = () => {
    if (!newSymbol) return;
    
    const pos: HypotheticalPosition = {
      underlying: newSymbol.substring(0, 4), // Rough guess
      symbol: newSymbol,
      type: 'stock',
      strike: 0,
      contracts: newQuantity,
      side: newQuantity > 0 ? 'long' : 'short',
      multiplier: 1,
      entryPrice: newPrice,
      valuationMethod: 'LAST',
      source: 'SIMULATED',
      greeks: { delta: newDelta, gamma: 0, theta: 0, vega: 0, rho: 0 }
    };
    
    setHypotheticalPositions([...hypotheticalPositions, pos]);
    setNewSymbol('');
  };

  const handleRemove = (index: number) => {
    const updated = [...hypotheticalPositions];
    updated.splice(index, 1);
    setHypotheticalPositions(updated);
  };

  const state = simulatePortfolio(basePositions, hypotheticalPositions);

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-6">What-If Simulator</h2>

      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Add Hypothetical Position</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Symbol</label>
            <input 
              type="text" 
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded p-2 text-white w-32"
              placeholder="e.g. AAPL"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Quantity</label>
            <input 
              type="number" 
              value={newQuantity}
              onChange={(e) => setNewQuantity(Number(e.target.value))}
              className="bg-gray-800 border border-gray-600 rounded p-2 text-white w-24"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Entry Price</label>
            <input 
              type="number" 
              value={newPrice}
              onChange={(e) => setNewPrice(Number(e.target.value))}
              className="bg-gray-800 border border-gray-600 rounded p-2 text-white w-24"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Delta (Per Unit)</label>
            <input 
              type="number" 
              value={newDelta}
              step="0.01"
              onChange={(e) => setNewDelta(Number(e.target.value))}
              className="bg-gray-800 border border-gray-600 rounded p-2 text-white w-24"
            />
          </div>
          <button 
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {hypotheticalPositions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Hypothetical Queue</h3>
          <div className="space-y-2">
            {hypotheticalPositions.map((p, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-900 border border-blue-900/50 rounded text-sm">
                <span className="text-white font-mono">{p.symbol}</span>
                <span className="text-gray-400">{p.side} {p.contracts} @ ${p.entryPrice}</span>
                <span className="text-blue-400">Δ {p.greeks?.delta}</span>
                <button 
                  onClick={() => handleRemove(i)}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Simulated Impact</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
            <div className="text-sm text-gray-500">Dollar Delta</div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-400 line-through">${state.baseGreeks.dollarDelta.toFixed(0)}</span>
              <span className="text-white font-bold">${state.simulatedGreeks.dollarDelta.toFixed(0)}</span>
            </div>
            <div className={`text-xs mt-2 ${state.deltaChange > 0 ? 'text-green-400' : state.deltaChange < 0 ? 'text-red-400' : 'text-gray-500'}`}>
              {state.deltaChange > 0 ? '+' : ''}{state.deltaChange.toFixed(0)}
            </div>
          </div>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
            <div className="text-sm text-gray-500">Dollar Gamma</div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-400 line-through">${state.baseGreeks.dollarGamma.toFixed(0)}</span>
              <span className="text-white font-bold">${state.simulatedGreeks.dollarGamma.toFixed(0)}</span>
            </div>
            <div className={`text-xs mt-2 ${state.gammaChange > 0 ? 'text-green-400' : state.gammaChange < 0 ? 'text-red-400' : 'text-gray-500'}`}>
              {state.gammaChange > 0 ? '+' : ''}{state.gammaChange.toFixed(0)}
            </div>
          </div>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
            <div className="text-sm text-gray-500">Dollar Theta</div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-400 line-through">${state.baseGreeks.dollarTheta.toFixed(0)}</span>
              <span className="text-white font-bold">${state.simulatedGreeks.dollarTheta.toFixed(0)}</span>
            </div>
            <div className={`text-xs mt-2 ${state.thetaChange > 0 ? 'text-green-400' : state.thetaChange < 0 ? 'text-red-400' : 'text-gray-500'}`}>
              {state.thetaChange > 0 ? '+' : ''}{state.thetaChange.toFixed(0)}
            </div>
          </div>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
            <div className="text-sm text-gray-500">Dollar Vega</div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-400 line-through">${state.baseGreeks.dollarVega.toFixed(0)}</span>
              <span className="text-white font-bold">${state.simulatedGreeks.dollarVega.toFixed(0)}</span>
            </div>
            <div className={`text-xs mt-2 ${state.vegaChange > 0 ? 'text-green-400' : state.vegaChange < 0 ? 'text-red-400' : 'text-gray-500'}`}>
              {state.vegaChange > 0 ? '+' : ''}{state.vegaChange.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
