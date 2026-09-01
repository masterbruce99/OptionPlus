import React, { useState, useMemo } from 'react';
import { OptionContract } from '../../lib/providers/MarketDataProvider';
import { calculateStraddleExpectedMove, calculateVolatilityExpectedMove } from '../../lib/probability/expectedMove';
import { ChainQuality } from './ChainQuality';
import { StrikeMap } from './StrikeMap';
import { GreekCurves } from './GreekCurves';
import { VolatilityAnalysis } from './VolatilityAnalysis';
import { LiquidityMap } from './LiquidityMap';
import { ContractScorecard } from './ContractScorecard';
import { HypotheticalSimulator } from './HypotheticalSimulator';
import { EducationalWorkflow } from './EducationalWorkflow';

interface Props {
  symbol: string;
  chain: OptionContract[];
  expirations: string[];
  underlyingPrice: number;
}

export const ChainIntelligence: React.FC<Props> = ({ symbol, chain, expirations, underlyingPrice }) => {
  const [selectedContract, setSelectedContract] = useState<OptionContract | null>(null);

  // Calculate expected move for StrikeMap boundaries
  const expectedMove = useMemo(() => {
    if (chain.length === 0 || expirations.length === 0) return null;
    const currentExp = chain[0].expiration;
    const dte = Math.max(1, Math.ceil((new Date(currentExp).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
    
    // Find ATM Call and Put
    const calls = chain.filter(c => c.type === 'call');
    if (calls.length === 0) return null;
    const atmCall = calls.reduce((prev, curr) =>
      Math.abs(curr.strike - underlyingPrice) < Math.abs(prev.strike - underlyingPrice) ? curr : prev
    );
    const atmPut = chain.find(c => c.strike === atmCall.strike && c.type === 'put');
    
    if (atmCall.ask && atmPut && atmPut.ask) {
      return calculateStraddleExpectedMove(underlyingPrice, atmCall.ask, atmPut.ask);
    } else if (atmCall.impliedVolatility) {
      return calculateVolatilityExpectedMove(underlyingPrice, atmCall.impliedVolatility, dte);
    }
    return null;
  }, [chain, expirations, underlyingPrice]);

  if (!symbol || chain.length === 0) {
    return <div>No options chain data available for analysis. Please search for a symbol.</div>;
  }

  return (
    <div className="chain-intelligence-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h2>Advanced Chain Intelligence</h2>
        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Comprehensive option chain market structure analysis</span>
      </div>

      <EducationalWorkflow />
      
      <ChainQuality 
        chain={chain} 
        underlyingPrice={underlyingPrice} 
        expiration={chain[0]?.expiration || ''} 
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        <StrikeMap 
          chain={chain} 
          underlyingPrice={underlyingPrice} 
          expectedMove={expectedMove}
          onSelectContract={setSelectedContract}
        />
        
        {selectedContract && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <ContractScorecard 
              contract={selectedContract} 
              underlyingPrice={underlyingPrice}
              expectedMove={expectedMove}
            />
            <HypotheticalSimulator 
              contract={selectedContract} 
            />
          </div>
        )}

        <VolatilityAnalysis 
          symbol={symbol}
          chain={chain}
          expirations={expirations}
          underlyingPrice={underlyingPrice}
        />

        <GreekCurves 
          chain={chain}
          underlyingPrice={underlyingPrice}
        />

        <LiquidityMap 
          chain={chain}
          underlyingPrice={underlyingPrice}
        />
      </div>
    </div>
  );
};
