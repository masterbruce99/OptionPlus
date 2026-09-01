'use client';

import React, { useState } from 'react';
import { BacktestConfig, BacktestResult, ExpirationRule, StrikeRule, EntryRule, ExitRule, ExecutionAssumption, StrategyType } from '../lib/backtest/types';
import { DefaultHistoricalProvider } from '../lib/data-infrastructure/provider';
import { BacktestEngine } from '../lib/backtest/engine';

export function BacktestScanner() {
  const [underlying, setUnderlying] = useState('SPY');
  const [strategy, setStrategy] = useState<StrategyType>('LONG_CALL');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2023-12-31');
  const [entryRule, setEntryRule] = useState<EntryRule>('DATE');
  const [exitRule, setExitRule] = useState<ExitRule>('EXPIRATION');
  const [expirationRule, setExpirationRule] = useState<ExpirationRule>('NEAREST');
  const [strikeRule, setStrikeRule] = useState<StrikeRule>('ATM');
  const [positionSize, setPositionSize] = useState(1);
  const [executionAssumption, setExecutionAssumption] = useState<ExecutionAssumption>('BID_ASK');
  
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const runBacktest = async () => {
    setIsRunning(true);
    setResult(null);

    const config: BacktestConfig = {
      underlying,
      strategy,
      startDate,
      endDate,
      entryRule: { type: entryRule },
      exitRule: { type: exitRule },
      expirationRule: { type: expirationRule },
      strikeRule: { type: strikeRule },
      positionSize,
      executionAssumption,
      costConfig: {
        commissionPerContractLeg: 0.65,
        exchangeFeePerContract: 0.30,
        regulatoryFeePerContract: 0.03,
        slippageFraction: 0.005,
        annualBorrowRate: 0.0,
        borrowCostKnown: false
      }
    };

    const provider = new DefaultHistoricalProvider();
    const engine = new BacktestEngine(config, provider);

    try {
      const res = await engine.run();
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-xl font-bold mb-4">Historical Options Backtest Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Underlying</label>
            <input type="text" className="border rounded p-2 uppercase" value={underlying} onChange={e => setUnderlying(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Strategy</label>
            <select className="border rounded p-2" value={strategy} onChange={e => setStrategy(e.target.value as StrategyType)}>
              <option value="LONG_CALL">Long Call</option>
              <option value="LONG_PUT">Long Put</option>
              <option value="COVERED_CALL">Covered Call</option>
              <option value="CASH_SECURED_PUT">Cash-Secured Put</option>
              <option value="BULL_CALL_SPREAD">Bull Call Spread</option>
              <option value="BEAR_PUT_SPREAD">Bear Put Spread</option>
              <option value="BULL_PUT_SPREAD">Bull Put Spread</option>
              <option value="BEAR_CALL_SPREAD">Bear Call Spread</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Start Date</label>
            <input type="date" className="border rounded p-2" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">End Date</label>
            <input type="date" className="border rounded p-2" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Position Size (Contracts)</label>
            <input type="number" className="border rounded p-2" value={positionSize} onChange={e => setPositionSize(Number(e.target.value))} min={1} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Entry Rule</label>
            <select className="border rounded p-2" value={entryRule} onChange={e => setEntryRule(e.target.value as EntryRule)}>
              <option value="DATE">Specific Date</option>
              <option value="SIGNAL">Signal Based (N/A)</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Exit Rule</label>
            <select className="border rounded p-2" value={exitRule} onChange={e => setExitRule(e.target.value as ExitRule)}>
              <option value="EXPIRATION">Hold to Expiration</option>
              <option value="PROFIT_TARGET">Profit Target</option>
              <option value="STOP_LOSS">Stop Loss</option>
              <option value="HOLDING_PERIOD">Fixed Holding Period</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Expiration Rule</label>
            <select className="border rounded p-2" value={expirationRule} onChange={e => setExpirationRule(e.target.value as ExpirationRule)}>
              <option value="NEAREST">Nearest Available</option>
              <option value="DTE_RANGE">Specific DTE Range</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Strike Rule</label>
            <select className="border rounded p-2" value={strikeRule} onChange={e => setStrikeRule(e.target.value as StrikeRule)}>
              <option value="ATM">At-The-Money (ATM)</option>
              <option value="PERCENT_OTM">% Out-of-the-Money</option>
              <option value="PERCENT_ITM">% In-the-Money</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Execution Assumption (BACKTEST ASSUMPTION)</label>
            <select className="border rounded p-2" value={executionAssumption} onChange={e => setExecutionAssumption(e.target.value as ExecutionAssumption)}>
              <option value="BID_ASK">Bid/Ask (Realistic)</option>
              <option value="MIDPOINT">Midpoint (Optimistic)</option>
            </select>
          </div>
        </div>
        
        <button 
          onClick={runBacktest}
          disabled={isRunning}
          className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Simulating...' : 'RUN BACKTEST'}
        </button>
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          {result.status === 'HISTORICAL_OPTIONS_BACKTEST_UNAVAILABLE_WITH_CURRENT_DATA_SOURCE' ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded shadow">
              <h3 className="text-red-800 font-bold text-xl mb-2 flex items-center">
                <span className="mr-2">⚠️</span> HISTORICAL OPTIONS BACKTEST UNAVAILABLE WITH CURRENT DATA SOURCE
              </h3>
              <p className="text-red-700 mb-4 font-medium">
                {result.reason}
              </p>
              <div className="bg-white p-4 rounded text-sm text-gray-700 mb-4 shadow-sm border border-red-100">
                <h4 className="font-bold mb-2">Real Data Rule Enforcement</h4>
                <p>OptionPlus strictly prohibits the fabrication of market data. The configured provider does not supply point-in-time historical option chains, Greeks, or historical bid/ask quotes.</p>
                <p className="mt-2">Rather than simulating a fake option chain or using an underlying-only approximation (which misrepresents options pricing dynamics like time decay and IV crush), the engine has aborted.</p>
              </div>
              <div className="bg-white p-4 rounded text-sm text-gray-700 shadow-sm border border-red-100">
                <h4 className="font-bold mb-2">Data & Assumption Panel (Module 25)</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Data Source:</strong> Tradier (Standard REST API)</li>
                  <li><strong>Missing Data:</strong> Historical EOD Option Chains, Historical Implied Volatility</li>
                  <li><strong>Execution Method:</strong> {result.config.executionAssumption}</li>
                  <li><strong>Limitations:</strong> Backtest cannot run without real historical option chain data.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded shadow">
              <h3 className="text-green-800 font-bold text-xl mb-2">VALID HISTORICAL ANALYSIS</h3>
              {/* Future metrics display would go here */}
            </div>
          )}

          {/* Module 26: Educational Engine */}
          <div className="bg-white rounded shadow p-6 border-t-4 border-blue-500">
            <h3 className="text-lg font-bold mb-4">Educational Explanations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-bold">Look-Ahead Bias</h4>
                <p className="text-sm mt-1"><strong>What it is:</strong> Using information in a backtest that was not actually available at the simulated time.</p>
                <p className="text-sm mt-1"><strong>Common Mistake:</strong> Buying an option because you know the stock will spike tomorrow.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-bold">Survivorship Bias</h4>
                <p className="text-sm mt-1"><strong>What it is:</strong> Only testing on assets that survived until today (e.g., ignoring bankrupt companies).</p>
                <p className="text-sm mt-1"><strong>Why it matters:</strong> It artificially inflates returns by erasing historical failures.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-bold">Execution Slippage</h4>
                <p className="text-sm mt-1"><strong>What it is:</strong> The difference between the expected price of a trade and the price at which the trade is actually executed.</p>
                <p className="text-sm mt-1"><strong>Common Mistake:</strong> Backtesting assuming you always get filled exactly at the midpoint of a wide bid/ask spread.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-bold">Overfitting</h4>
                <p className="text-sm mt-1"><strong>What it is:</strong> Tweaking backtest rules until they perfectly match past data, rather than reflecting a robust predictive strategy.</p>
                <p className="text-sm mt-1"><strong>Why it matters:</strong> Overfitted strategies almost always fail in live trading.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
