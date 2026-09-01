'use client';
import { useState, useEffect } from 'react';
import { OptionContract } from '@/lib/providers/MarketDataProvider';
import { TradeLeg } from '@/lib/payoffEngine';
import EducationalTooltip from './EducationalTooltip';

interface TradeBuilderProps {
  currentUnderlying: number;
  chain: OptionContract[];
  onLegsChange: (legs: TradeLeg[], contracts: Map<string, OptionContract>) => void;
}

type StrategyType = 'Long Call' | 'Long Put' | 'Covered Call' | 'Cash-Secured Put' | 'Bull Call Spread' | 'Bear Put Spread' | 'Bull Put Spread' | 'Bear Call Spread';

export default function TradeBuilder({ currentUnderlying, chain, onLegsChange }: TradeBuilderProps) {
  const [strategy, setStrategy] = useState<StrategyType>('Long Call');
  const [quantity, setQuantity] = useState<number>(1);
  const [customQuantity, setCustomQuantity] = useState<string>('');
  
  // Selected strikes for the strategy legs
  const [leg1Strike, setLeg1Strike] = useState<number>(0);
  const [leg2Strike, setLeg2Strike] = useState<number>(0);
  const [stockEntry, setStockEntry] = useState<number>(currentUnderlying);

  // Get available strikes from chain
  const strikes = Array.from(new Set(chain.map(c => c.strike))).sort((a, b) => a - b);
  
  useEffect(() => {
    // Auto-select ATM-ish strikes on initial load or chain change
    if (strikes.length > 0 && leg1Strike === 0) {
      const atm = strikes.reduce((prev, curr) => Math.abs(curr - currentUnderlying) < Math.abs(prev - currentUnderlying) ? curr : prev);
      setLeg1Strike(atm);
      
      const nextStrike = strikes.find(s => s > atm) || atm;
      setLeg2Strike(nextStrike);
    }
  }, [strikes, currentUnderlying]);

  useEffect(() => {
    if (leg1Strike === 0) return; // Wait for initial auto-select

    const qty = customQuantity ? parseInt(customQuantity) || 1 : quantity;
    const newLegs: TradeLeg[] = [];
    const contractMap = new Map<string, OptionContract>();

    const addOptionLeg = (type: 'call' | 'put', side: 'long' | 'short', strike: number, id: string) => {
      const contract = chain.find(c => c.type === type && c.strike === strike);
      if (contract) {
        contractMap.set(id, contract);
        newLegs.push({
          id,
          type,
          side,
          strike,
          quantity: qty,
          entryPrice: contract.last || (contract.bid + contract.ask) / 2 || 0,
          multiplier: 100
        });
      }
    };

    switch (strategy) {
      case 'Long Call':
        addOptionLeg('call', 'long', leg1Strike, 'leg1');
        break;
      case 'Long Put':
        addOptionLeg('put', 'long', leg1Strike, 'leg1');
        break;
      case 'Covered Call':
        newLegs.push({
          id: 'stock', type: 'stock', side: 'long', strike: 0, quantity: qty, entryPrice: stockEntry, multiplier: 100
        });
        addOptionLeg('call', 'short', leg1Strike, 'leg1');
        break;
      case 'Cash-Secured Put':
        addOptionLeg('put', 'short', leg1Strike, 'leg1');
        break;
      case 'Bull Call Spread':
        addOptionLeg('call', 'long', Math.min(leg1Strike, leg2Strike), 'leg1');
        addOptionLeg('call', 'short', Math.max(leg1Strike, leg2Strike), 'leg2');
        break;
      case 'Bear Call Spread':
        addOptionLeg('call', 'short', Math.min(leg1Strike, leg2Strike), 'leg1');
        addOptionLeg('call', 'long', Math.max(leg1Strike, leg2Strike), 'leg2');
        break;
      case 'Bull Put Spread':
        addOptionLeg('put', 'long', Math.min(leg1Strike, leg2Strike), 'leg1');
        addOptionLeg('put', 'short', Math.max(leg1Strike, leg2Strike), 'leg2');
        break;
      case 'Bear Put Spread':
        addOptionLeg('put', 'short', Math.min(leg1Strike, leg2Strike), 'leg1');
        addOptionLeg('put', 'long', Math.max(leg1Strike, leg2Strike), 'leg2');
        break;
    }

    onLegsChange(newLegs, contractMap);
  }, [strategy, leg1Strike, leg2Strike, stockEntry, quantity, customQuantity, chain]);

  const isSpread = strategy.includes('Spread');
  const needsStock = strategy === 'Covered Call';

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem' }}>Trade Builder</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Strategy</label>
          <select 
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as StrategyType)}
            style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
          >
            <option value="Long Call">Long Call</option>
            <option value="Long Put">Long Put</option>
            <option value="Covered Call">Covered Call</option>
            <option value="Cash-Secured Put">Cash-Secured Put</option>
            <option value="Bull Call Spread">Bull Call Spread</option>
            <option value="Bear Put Spread">Bear Put Spread</option>
            <option value="Bull Put Spread">Bull Put Spread</option>
            <option value="Bear Call Spread">Bear Call Spread</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Quantity (Contracts)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 5, 10].map(q => (
                <button
                  key={q}
                  onClick={() => { setQuantity(q); setCustomQuantity(''); }}
                  style={{
                    padding: '8px 12px',
                    background: quantity === q && !customQuantity ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: quantity === q && !customQuantity ? '#fff' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >{q}</button>
              ))}
              <input 
                type="number" 
                placeholder="Custom" 
                value={customQuantity}
                onChange={(e) => {
                  setCustomQuantity(e.target.value);
                  if (e.target.value) setQuantity(parseInt(e.target.value));
                }}
                style={{ width: '80px', padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>

        {needsStock && (
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
              Stock Entry Price <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>[USER INPUT]</span>
            </label>
            <input 
              type="number"
              step="0.01"
              value={stockEntry}
              onChange={(e) => setStockEntry(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
              {isSpread ? 'Leg 1 Strike' : (needsStock ? 'Short Call Strike' : 'Strike')} <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>[REAL MARKET DATA]</span>
            </label>
            <select
              value={leg1Strike}
              onChange={(e) => setLeg1Strike(parseFloat(e.target.value))}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
            >
              {strikes.map(s => <option key={s} value={s}>{s.toFixed(2)}</option>)}
            </select>
          </div>

          {isSpread && (
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                Leg 2 Strike <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>[REAL MARKET DATA]</span>
              </label>
              <select
                value={leg2Strike}
                onChange={(e) => setLeg2Strike(parseFloat(e.target.value))}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
              >
                {strikes.map(s => <option key={s} value={s}>{s.toFixed(2)}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
