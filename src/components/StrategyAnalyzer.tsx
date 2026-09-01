'use client';
import { useState, useCallback } from 'react';
import { OptionContract } from '@/lib/providers/MarketDataProvider';
import { TradeLeg, StrategyAnalysis, analyzeStrategy } from '@/lib/payoffEngine';
import { evaluateRisk } from '@/lib/riskEngine';
import TradeBuilder from './TradeBuilder';
import PayoffGraph from './PayoffGraph';
import ScenarioAnalysis from './ScenarioAnalysis';
import GreekExposure from './GreekExposure';
import TimeDecayVisualizer from './TimeDecayVisualizer';
import StrategyComparison from './StrategyComparison';


interface StrategyAnalyzerProps {
  currentUnderlying: number;
  chain: OptionContract[];
  daysToExpiration: number;
}

export default function StrategyAnalyzer({ currentUnderlying, chain, daysToExpiration }: StrategyAnalyzerProps) {
  const [legs, setLegs] = useState<TradeLeg[]>([]);
  const [contracts, setContracts] = useState<Map<string, OptionContract>>(new Map());
  const [savedStrategies, setSavedStrategies] = useState<StrategyAnalysis[]>([]);

  const handleLegsChange = useCallback((newLegs: TradeLeg[], newContracts: Map<string, OptionContract>) => {
    setLegs(newLegs);
    setContracts(newContracts);
  }, []);

  // 1. Analyze Current Strategy
  const currentAnalysis = analyzeStrategy(legs, currentUnderlying);
  
  // 2. Evaluate Risks
  const warnings = evaluateRisk(legs, contracts, daysToExpiration);

  const handleSaveStrategy = () => {
    if (currentAnalysis && savedStrategies.length < 3) {
      setSavedStrategies([...savedStrategies, currentAnalysis]);
    }
  };

  const handleRemoveSaved = (index: number) => {
    setSavedStrategies(savedStrategies.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* STEP 1-4: Builder */}
      <TradeBuilder 
        currentUnderlying={currentUnderlying} 
        chain={chain} 
        onLegsChange={handleLegsChange} 
      />

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {warnings.map((w, i) => (
            <div key={i} className="card" style={{ borderLeft: '4px solid var(--warning)', padding: '1rem' }}>
              <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '0.2rem' }}>{w.title}</strong>
              <span style={{ fontSize: '0.9rem' }}>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {currentAnalysis && (
        <>
          {/* STEP 5-6: Risk & Reward Summary */}
          <div className="card animate-fade-in" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>{currentAnalysis.name} Summary</h2>
              <button 
                onClick={handleSaveStrategy} 
                disabled={savedStrategies.length >= 3}
                style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: savedStrategies.length >= 3 ? 'not-allowed' : 'pointer' }}
              >
                Compare (+{savedStrategies.length}/3)
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Max Profit</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                  {currentAnalysis.maxProfit === null ? 'Infinite' : `$${currentAnalysis.maxProfit.toFixed(2)}`}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Max Loss</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                  {currentAnalysis.maxLoss === null ? 'Infinite' : `$${Math.abs(currentAnalysis.maxLoss).toFixed(2)}`}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Break-Even(s)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {currentAnalysis.breakEvens.map(b => `$${b.toFixed(2)}`).join(', ')}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Capital Required</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  ${currentAnalysis.capitalRequired.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Entry (Debit/Credit)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {currentAnalysis.netDebitCredit >= 0 ? `Credit $${currentAnalysis.netDebitCredit.toFixed(2)}` : `Debit $${Math.abs(currentAnalysis.netDebitCredit).toFixed(2)}`}
                  <br/><span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>*Transaction fees not included</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              DATA SOURCE: CALCULATED FROM MARKET DATA (or USER INPUT for stock basis). Break-evens and profit/loss calculated AT EXPIRATION.
            </div>
          </div>

          {/* STEP 7: Payoff Graph */}
          <div className="card animate-fade-in">
            <h3 style={{ marginBottom: '1rem' }}>Payoff at Expiration</h3>
            <PayoffGraph 
              data={currentAnalysis.payoffData} 
              currentUnderlying={currentUnderlying} 
              breakEvens={currentAnalysis.breakEvens} 
            />
          </div>

          {/* STEP 8: Scenario Analysis */}
          <div className="animate-fade-in">
            <ScenarioAnalysis 
              legs={legs}
              currentUnderlying={currentUnderlying}
              contracts={contracts}
              daysToExpiration={daysToExpiration}
            />
          </div>

          {/* STEP 9: Greeks */}
          <div className="animate-fade-in">
            <GreekExposure legs={legs} contracts={contracts} />
          </div>

          {/* STEP 10: Time Decay Visualizer */}
          {legs.length === 1 && legs[0].type !== 'stock' && (
            <div className="animate-fade-in">
              <TimeDecayVisualizer 
                contract={contracts.get(legs[0].id)!} 
                daysToExpiration={daysToExpiration} 
              />
            </div>
          )}
        </>
      )}

      {savedStrategies.length > 0 && (
        <div className="animate-fade-in">
          <StrategyComparison strategies={savedStrategies} onRemove={handleRemoveSaved} />
        </div>
      )}

    </div>
  );
}
