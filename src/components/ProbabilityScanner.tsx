"use client";

import React, { useState } from 'react';
import { calculateStraddleExpectedMove, calculateVolatilityExpectedMove } from '../lib/probability/expectedMove';
import { calculateOptionProbabilities } from '../lib/probability/probabilityEngine';
import { calculateProbabilityOfProfit } from '../lib/probability/probabilityOfProfit';
import { buildVolatilityContext } from '../lib/probability/volatilityAnalysis';
import { ProbabilityAnalysis, ExpectedMove, VolatilityContext, HistoricalPrice } from '../lib/probability/types';

export default function ProbabilityScanner() {
  const [underlyingPrice, setUnderlyingPrice] = useState<number>(100);
  const [strike, setStrike] = useState<number>(100);
  const [daysToExpiration, setDaysToExpiration] = useState<number>(30);
  const [iv, setIv] = useState<number>(0.25);
  const [riskFreeRate, setRiskFreeRate] = useState<number>(0.04);
  const [atmCallAsk, setAtmCallAsk] = useState<number>(3.50);
  const [atmPutAsk, setAtmPutAsk] = useState<number>(3.50);

  // Compute values
  const straddleEM = calculateStraddleExpectedMove(underlyingPrice, atmCallAsk, atmPutAsk);
  const volEM = calculateVolatilityExpectedMove(underlyingPrice, iv, daysToExpiration);
  
  const callProb = calculateOptionProbabilities({
    S: underlyingPrice, K: strike, T: daysToExpiration / 365, r: riskFreeRate, v: iv
  }, 'call');
  
  const popExample = calculateProbabilityOfProfit({
    S: underlyingPrice, breakEven: underlyingPrice + atmCallAsk, T: daysToExpiration / 365, r: riskFreeRate, v: iv, strategy: 'Long Call'
  });

  // Mock historical data just for the demo/UI (but clearly label if missing)
  const mockHistoricalPrices: HistoricalPrice[] = Array(30).fill(0).map((_, i) => ({
    date: `Day ${i}`,
    close: 100 + Math.random() * 5 - 2.5
  }));
  const mockHistoricalIvs = Array(30).fill(0).map(() => 0.20 + Math.random() * 0.10);

  const volContext = buildVolatilityContext({
    currentIV: iv,
    historicalIVs: mockHistoricalIvs,
    historicalPrices: mockHistoricalPrices,
    ivHistoryRequired: 20
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Probability & Volatility Intelligence</h2>
        <p className="text-sm text-gray-500 mb-6">
          Analyze implied volatility, expected market moves, and model-based probabilities. 
          <span className="font-semibold text-amber-600 dark:text-amber-400"> This is an educational tool, not a trading recommendation system.</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Underlying Price</label>
            <input type="number" value={underlyingPrice} onChange={e => setUnderlyingPrice(Number(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Strike Price</label>
            <input type="number" value={strike} onChange={e => setStrike(Number(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Days to Expiration</label>
            <input type="number" value={daysToExpiration} onChange={e => setDaysToExpiration(Number(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Implied Volatility (decimal)</label>
            <input type="number" step="0.01" value={iv} onChange={e => setIv(Number(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Volatility Context */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Volatility Context</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Current IV:</span>
                <span className="font-mono text-gray-900 dark:text-white">{(volContext.currentIV! * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Realized Volatility (20d):</span>
                <span className="font-mono text-gray-900 dark:text-white">{volContext.realizedVolatility20d ? (volContext.realizedVolatility20d * 100).toFixed(2) + '%' : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>IV Rank:</span>
                <span className="font-mono text-gray-900 dark:text-white">{volContext.ivRank !== null ? volContext.ivRank.toFixed(1) : 'INSUFFICIENT DATA'}</span>
              </div>
              <div className="flex justify-between">
                <span>IV Percentile:</span>
                <span className="font-mono text-gray-900 dark:text-white">{volContext.ivPercentile !== null ? volContext.ivPercentile.toFixed(1) : 'INSUFFICIENT DATA'}</span>
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-xs">
                <strong>Methodology:</strong> {volContext.methodology}
                <ul className="list-disc pl-4 mt-1">
                  {volContext.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* Expected Move */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Expected Move (Model)</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>1 Standard Deviation Move:</span>
                <span className="font-mono text-gray-900 dark:text-white">±${volEM.value.toFixed(2)} ({(volEM.percentage * 100).toFixed(2)}%)</span>
              </div>
              <div className="flex justify-between">
                <span>Implied Range (Low):</span>
                <span className="font-mono text-gray-900 dark:text-white">${volEM.impliedRangeLow.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Implied Range (High):</span>
                <span className="font-mono text-gray-900 dark:text-white">${volEM.impliedRangeHigh.toFixed(2)}</span>
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-xs">
                <strong>Methodology:</strong> {volEM.methodology}
                <ul className="list-disc pl-4 mt-1">
                  {volEM.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* Probability Estimates */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Probability Estimates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 border-b pb-1">ITM Probability (Strike: ${strike})</h4>
                <div className="flex justify-between">
                  <span>Prob Above Strike (Call ITM):</span>
                  <span className="font-mono text-gray-900 dark:text-white">{callProb.probabilityAbove ? (callProb.probabilityAbove * 100).toFixed(1) + '%' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prob Below Strike (Put ITM):</span>
                  <span className="font-mono text-gray-900 dark:text-white">{callProb.probabilityBelow ? (callProb.probabilityBelow * 100).toFixed(1) + '%' : 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 border-b pb-1">Probability of Profit (Example Long Call)</h4>
                <div className="flex justify-between">
                  <span>Strategy:</span>
                  <span className="font-mono text-gray-900 dark:text-white">Long Call</span>
                </div>
                <div className="flex justify-between">
                  <span>Break-Even Price:</span>
                  <span className="font-mono text-gray-900 dark:text-white">${(underlyingPrice + atmCallAsk).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prob of Profit (POP):</span>
                  <span className="font-mono text-gray-900 dark:text-white">{popExample.probabilityOfProfit ? (popExample.probabilityOfProfit * 100).toFixed(1) + '%' : 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded text-xs">
              <strong>LIMITATION WARNING:</strong>
              <ul className="list-disc pl-4 mt-1">
                {callProb.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                <li>An estimated probability (e.g., 70%) is <strong>not a guarantee</strong>. It is a model-based estimate conditional on the assumptions and inputs.</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
