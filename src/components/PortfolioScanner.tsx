'use client';
import { useState, useEffect } from 'react';
import { PortfolioPosition, PortfolioGreeks, ConcentrationReport, RiskWarning, ScenarioResult } from '@/lib/portfolio/types';
import { calculatePositionPnL, aggregatePortfolioGreeks, analyzeConcentration, calculateNotionalExposure, calculatePremiumExposure } from '@/lib/portfolio/engine';
import { generateExpirationPayoff, generateScenarioMatrix, generateTimeDecayScenarios } from '@/lib/portfolio/scenarios';
import { analyzeAssignmentRisk, analyzeExpirationRisk, analyzeExerciseRisk, analyzeGreekExposure, analyzeConcentrationRisk, analyzeDataQuality, calculateDeltaHedge } from '@/lib/portfolio/risk';

export function PortfolioScanner({ currentUnderlyingPrice }: { currentUnderlyingPrice: number }) {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  
  // Manual Entry Form State
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'call' | 'put' | 'stock'>('call');
  const [strike, setStrike] = useState(0);
  const [expiration, setExpiration] = useState('');
  const [contracts, setContracts] = useState(1);
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [entryPrice, setEntryPrice] = useState(0);

  // Scenarios
  const [scenarioMatrix, setScenarioMatrix] = useState<ScenarioResult[]>([]);
  const [decayScenarios, setDecayScenarios] = useState<ScenarioResult[]>([]);

  // Computed state
  const greeks: PortfolioGreeks = aggregatePortfolioGreeks(positions);
  const concentration: ConcentrationReport = analyzeConcentration(positions);
  const notional = calculateNotionalExposure(positions, { AAPL: currentUnderlyingPrice }); // hardcoding AAPL just for demo if underlying isn't populated
  const premium = calculatePremiumExposure(positions);
  
  const warnings: RiskWarning[] = [
    ...analyzeAssignmentRisk(positions),
    ...analyzeExpirationRisk(positions),
    ...analyzeExerciseRisk(positions),
    ...analyzeGreekExposure(greeks),
    ...analyzeConcentrationRisk(concentration),
    ...analyzeDataQuality(positions)
  ];

  const totalPnL = positions.reduce((sum, pos) => sum + calculatePositionPnL(pos), 0);
  const deltaHedge = calculateDeltaHedge(greeks.dollarDelta);

  useEffect(() => {
    if (positions.length > 0 && currentUnderlyingPrice > 0) {
      setScenarioMatrix(generateScenarioMatrix(positions, currentUnderlyingPrice));
      setDecayScenarios(generateTimeDecayScenarios(positions));
    }
  }, [positions, currentUnderlyingPrice]);

  const handleAddPosition = () => {
    const newPos: PortfolioPosition = {
      id: `pos-${Date.now()}`,
      underlying: symbol.toUpperCase() || 'UNKNOWN',
      symbol: `${symbol.toUpperCase()} ${expiration} ${strike}${type.substring(0,1).toUpperCase()}`,
      type,
      strike,
      expiration,
      contracts,
      side,
      entryPrice,
      multiplier: type === 'stock' ? 1 : 100,
      timestamp: Date.now(),
      source: 'USER_INPUT',
      valuationMethod: 'USER_DEFINED',
      userMark: entryPrice, // Default mark to entry
    };
    setPositions([...positions, newPos]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      <h2>Portfolio Risk & Position Intelligence</h2>
      
      <div style={{ padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)' }}>
        <h3>Add Manual Position</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <input placeholder="Underlying" value={symbol} onChange={e => setSymbol(e.target.value)} />
          <select value={type} onChange={e => setType(e.target.value as any)}>
            <option value="call">Call</option>
            <option value="put">Put</option>
            <option value="stock">Stock</option>
          </select>
          {type !== 'stock' && <input type="number" placeholder="Strike" value={strike} onChange={e => setStrike(Number(e.target.value))} />}
          {type !== 'stock' && <input type="date" placeholder="Expiration" value={expiration} onChange={e => setExpiration(e.target.value)} />}
          <select value={side} onChange={e => setSide(e.target.value as any)}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
          <input type="number" placeholder="Contracts/Shares" value={contracts} onChange={e => setContracts(Number(e.target.value))} />
          <input type="number" placeholder="Entry Price" value={entryPrice} onChange={e => setEntryPrice(Number(e.target.value))} />
        </div>
        <button onClick={handleAddPosition} style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: 'white', borderRadius: '4px' }}>
          Add Position
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <h3>Portfolio Greeks</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>Delta: {greeks.netDelta.toFixed(2)} (≈ ${greeks.dollarDelta.toFixed(2)} share eq)</li>
            <li>Gamma: {greeks.netGamma.toFixed(4)}</li>
            <li>Theta: {greeks.netTheta.toFixed(2)} (≈ ${greeks.dollarTheta.toFixed(2)}/day)</li>
            <li>Vega: {greeks.netVega.toFixed(2)}</li>
          </ul>
          <div style={{ marginTop: '10px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
            <strong>Delta Neutrality:</strong> To hedge directional risk, consider {deltaHedge > 0 ? 'buying' : 'shorting'} {Math.abs(Math.round(deltaHedge))} shares.
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '300px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <h3>Capital & Exposure</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>Premium Exposure: ${premium.toFixed(2)}</li>
            <li>Modelled Capital Req: ${(Math.abs(premium) * 1.2).toFixed(2)} <em>(Not broker margin)</em></li>
            <li>Notional Exposure: ${notional.toFixed(2)}</li>
            <li>Current P/L: ${totalPnL.toFixed(2)}</li>
          </ul>
        </div>
      </div>

      <div style={{ padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <h3>Risk Warnings</h3>
        {warnings.length === 0 ? (
          <p>No immediate risks detected.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {warnings.map(w => (
              <li key={w.id} style={{ marginBottom: '10px', padding: '10px', backgroundColor: w.severity === 'CRITICAL' ? 'rgba(255,0,0,0.1)' : w.severity === 'WARNING' ? 'rgba(255,165,0,0.1)' : 'rgba(0,0,255,0.1)', borderLeft: \`4px solid \${w.severity === 'CRITICAL' ? 'red' : w.severity === 'WARNING' ? 'orange' : 'blue'}\` }}>
                <strong>{w.type}</strong>: {w.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {positions.length > 0 && (
        <div style={{ padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <h3>Positions</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th>Symbol</th>
                <th>Side</th>
                <th>Qty</th>
                <th>Entry</th>
                <th>Mark</th>
                <th>P/L</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td>{p.symbol}</td>
                  <td>{p.side}</td>
                  <td>{p.contracts}</td>
                  <td>${p.entryPrice.toFixed(2)}</td>
                  <td>${(p.userMark ?? p.entryPrice).toFixed(2)}</td>
                  <td style={{ color: calculatePositionPnL(p) >= 0 ? '#4caf50' : '#f44336' }}>${calculatePositionPnL(p).toFixed(2)}</td>
                  <td>
                    <button onClick={() => setPositions(positions.filter(pos => pos.id !== p.id))} style={{ padding: '4px 8px', fontSize: '0.8em', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {positions.length > 0 && (
        <div style={{ padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <h3>What-If Scenarios</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', overflowX: 'auto' }}>
             {/* Just a simple rendering of the matrix */}
             {scenarioMatrix.filter(s => s.ivChange === 0).map(s => (
               <div key={s.priceChange} style={{ padding: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                 <div>Price: {s.priceChange > 0 ? '+' : ''}{(s.priceChange * 100).toFixed(0)}%</div>
                 <div style={{ color: s.projectedPnL >= 0 ? '#4caf50' : '#f44336' }}>${s.projectedPnL.toFixed(2)}</div>
               </div>
             ))}
          </div>
        </div>
      )}

    </div>
  );
}
