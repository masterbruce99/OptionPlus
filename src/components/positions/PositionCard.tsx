import React from 'react';
import { LivePosition, AdjustmentRecommendation } from '../../lib/positions/types';
import { Quote, OptionContract } from '../../lib/providers/MarketDataProvider';
import { calculateRealTimePnL, evaluateLifecycleState, evaluateAdjustments, closePosition } from '../../lib/positions/positionEngine';
import AdjustmentPanel from './AdjustmentPanel';

interface PositionCardProps {
  position: LivePosition;
  currentQuote: Quote | null;
  currentChain: OptionContract[];
  onPositionUpdated: (position: LivePosition) => void;
  onPositionClosed: (position: LivePosition, review: string) => void;
}

export default function PositionCard({ position, currentQuote, currentChain, onPositionUpdated, onPositionClosed }: PositionCardProps) {
  
  // Real-time calculation if quote is available
  const pnl = currentQuote ? calculateRealTimePnL(position, currentQuote, currentChain) : position.currentPnL;
  const status = evaluateLifecycleState({ ...position, currentPnL: pnl });
  const adjustment = currentQuote ? evaluateAdjustments({ ...position, currentPnL: pnl }, currentQuote) : position.adjustmentRecommendation;

  const handleClose = (review: string) => {
    if (!currentQuote) return;
    // For simplicity, we assume closing at current market price
    const exitFills = position.fills.map(f => {
      const leg = position.plan.legs.find(l => l.id === f.legId);
      let exitPrice = f.fillPrice;
      
      if (leg?.type === 'stock') {
        exitPrice = currentQuote.price || exitPrice;
      } else if (leg) {
        const option = currentChain.find(o => o.type === leg.type && o.strike === leg.strike);
        if (option && option.bid !== null && option.ask !== null) {
          exitPrice = leg.side === 'long' ? option.bid : option.ask; // sell at bid, buy to cover at ask
        }
      }
      return { legId: f.legId, fillPrice: exitPrice, quantity: f.quantity, filledAt: Date.now() };
    });
    
    const closedPos = closePosition(position, exitFills, currentQuote, review, 'NONE');
    onPositionClosed(closedPos, review);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'OPEN': return 'var(--accent-primary)';
      case 'ADJUSTMENT_NEEDED': return 'var(--color-warning, #f39c12)';
      case 'EXIT_READY': return 'var(--color-success, #2ecc71)';
      case 'CLOSED': return 'var(--text-muted)';
      default: return 'var(--text-primary)';
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1rem', borderLeft: `4px solid ${statusColor(status)}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>{position.underlying} - {position.plan.strategyName}</h3>
          <span style={{ 
            fontSize: '0.8rem', 
            padding: '2px 8px', 
            borderRadius: '12px', 
            background: 'var(--bg-secondary)',
            color: statusColor(status),
            fontWeight: 'bold'
          }}>
            {status}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: (pnl.unrealizedPnL || 0) >= 0 ? 'var(--text-success)' : 'var(--text-danger)' }}>
            ${(pnl.unrealizedPnL || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ROC: {pnl.returnOnCapital}%
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
        <div>
          <strong style={{ color: 'var(--text-muted)' }}>Entry Fills</strong>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.2rem' }}>
            {position.fills.map(f => {
              const leg = position.plan.legs.find(l => l.id === f.legId);
              if (!leg) return null;
              return (
                <li key={f.legId}>
                  {f.quantity}x {leg.side} {leg.type === 'stock' ? 'Stock' : `${leg.strike} ${leg.type}`} @ ${f.fillPrice.toFixed(2)}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <strong style={{ color: 'var(--text-muted)' }}>Planned Risk</strong>
          <div style={{ marginTop: '0.5rem' }}>
            Max Loss: ${position.plan.maxPlannedLoss || 'Infinite'}<br/>
            Target: ${position.plan.targetPrice || 'N/A'}<br/>
            Margin Utilized: ${pnl.marginUtilization}
          </div>
        </div>
      </div>

      {(status === 'ADJUSTMENT_NEEDED' || status === 'EXIT_READY') && adjustment && adjustment.type !== 'NONE' && (
        <div style={{ marginTop: '1rem' }}>
          <AdjustmentPanel 
            recommendation={adjustment}
            onActionTaken={() => {}} // Hook for future roll features
          />
        </div>
      )}

      {status !== 'CLOSED' && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => handleClose('Manual close initiated from position monitor.')}
            style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
          >
            Close Position
          </button>
        </div>
      )}
    </div>
  );
}
