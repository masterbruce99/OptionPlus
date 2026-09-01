import { PortfolioPosition, ScenarioResult } from './types';
import { TradeLeg, calculatePayoff, PayoffPoint } from '../payoffEngine';

export function mapToTradeLegs(positions: PortfolioPosition[]): TradeLeg[] {
  return positions.map(pos => ({
    id: pos.id,
    type: pos.type,
    side: pos.side,
    strike: pos.strike,
    quantity: pos.contracts,
    entryPrice: pos.entryPrice,
    multiplier: pos.multiplier
  }));
}

export function generateExpirationPayoff(positions: PortfolioPosition[], currentUnderlyingPrice: number, rangePercent: number = 0.2): PayoffPoint[] {
  const legs = mapToTradeLegs(positions);
  return calculatePayoff(legs, currentUnderlyingPrice, rangePercent);
}

export function generateScenarioMatrix(
  positions: PortfolioPosition[],
  currentUnderlyingPrice: number,
  priceChanges: number[] = [-0.10, -0.05, -0.02, 0, 0.02, 0.05, 0.10],
  ivChanges: number[] = [-10, -5, 0, 5, 10]
): ScenarioResult[] {
  const results: ScenarioResult[] = [];

  for (const pChange of priceChanges) {
    for (const ivChange of ivChanges) {
      let projectedPnL = 0;
      let notes: string[] = [];

      const targetPrice = currentUnderlyingPrice * (1 + pChange);

      for (const pos of positions) {
        if (!pos.greeks) {
          notes.push(`Missing Greeks for ${pos.symbol}`);
          continue;
        }
        
        // Very basic Taylor Series approximation for scenario
        // PnL ≈ Delta * dS + 0.5 * Gamma * dS^2 + Vega * dIV
        const dS = targetPrice - currentUnderlyingPrice;
        
        // dIV is points, e.g. +5% is 5. But vega is usually per 1 point.
        const dIV = ivChange; 
        
        const deltaPnL = pos.greeks.delta * dS;
        const gammaPnL = 0.5 * pos.greeks.gamma * (dS * dS);
        const vegaPnL = pos.greeks.vega * dIV;
        
        const posPnL = (deltaPnL + gammaPnL + vegaPnL) * pos.contracts * pos.multiplier * (pos.side === 'long' ? 1 : -1);
        projectedPnL += posPnL;
      }
      
      results.push({
        priceChange: pChange,
        ivChange,
        daysForward: 0,
        projectedPnL,
        notes: Array.from(new Set(notes))
      });
    }
  }

  return results;
}

export function generateTimeDecayScenarios(positions: PortfolioPosition[], daysForward: number[] = [1, 3, 7]): ScenarioResult[] {
  const results: ScenarioResult[] = [];

  for (const days of daysForward) {
    let projectedPnL = 0;
    for (const pos of positions) {
      if (pos.greeks) {
        // Theta is typically daily decay
        const thetaPnL = pos.greeks.theta * days;
        projectedPnL += thetaPnL * pos.contracts * pos.multiplier * (pos.side === 'long' ? 1 : -1);
      }
    }
    
    results.push({
      priceChange: 0,
      ivChange: 0,
      daysForward: days,
      projectedPnL,
      notes: []
    });
  }

  return results;
}
