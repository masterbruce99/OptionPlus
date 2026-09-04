import React, { useEffect, useState } from 'react';
import { Quote, OptionContract } from '../../lib/providers/MarketDataProvider';
import { LivePosition } from '../../lib/positions/types';
import { getLivePositions, updateLivePosition } from '../../lib/positions/positionStore';
import PositionCard from './PositionCard';

interface PositionsWorkspaceProps {
  quote: Quote | null;
  chain: OptionContract[];
  symbol: string;
}

export function PositionsWorkspace({ quote, chain, symbol }: PositionsWorkspaceProps) {
  const [positions, setPositions] = useState<LivePosition[]>([]);

  useEffect(() => {
    // In a real app we'd fetch all positions, but we'll filter by current selected symbol
    const all = getLivePositions();
    setPositions(all.filter(p => p.underlying === symbol));
  }, [symbol]);

  const handlePositionUpdated = (updated: LivePosition) => {
    updateLivePosition(updated.id, updated);
    setPositions(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handlePositionClosed = (closed: LivePosition, review: string) => {
    updateLivePosition(closed.id, closed);
    setPositions(prev => prev.map(p => p.id === closed.id ? closed : p));
  };

  const openPositions = positions.filter(p => p.status !== 'CLOSED');
  const closedPositions = positions.filter(p => p.status === 'CLOSED');

  return (
    <div className="card animate-fade-in" style={{ padding: '2rem' }}>
      <h2>Live Positions & Lifecycle Monitoring</h2>
      <p className="text-muted" style={{ marginBottom: '2rem' }}>
        Monitor real-time execution P&L, live risk, and adjustment recommendations.
      </p>

      {openPositions.length === 0 && closedPositions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
          <p className="text-muted">No positions recorded for {symbol}.</p>
          <p style={{ fontSize: '0.9rem' }}>Use the Execution Workspace to plan a trade, then click "Record Fills & Open Position".</p>
        </div>
      )}

      {openPositions.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Active Positions</h3>
          {openPositions.map(pos => (
            <PositionCard 
              key={pos.id}
              position={pos}
              currentQuote={quote}
              currentChain={chain}
              onPositionUpdated={handlePositionUpdated}
              onPositionClosed={handlePositionClosed}
            />
          ))}
        </div>
      )}

      {closedPositions.length > 0 && (
        <div>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Closed Positions</h3>
          {closedPositions.map(pos => (
            <PositionCard 
              key={pos.id}
              position={pos}
              currentQuote={null} // Don't recalculate PnL for closed
              currentChain={[]}
              onPositionUpdated={handlePositionUpdated}
              onPositionClosed={handlePositionClosed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
