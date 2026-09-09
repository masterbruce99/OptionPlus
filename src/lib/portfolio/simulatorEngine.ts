import { PortfolioPosition, PortfolioGreeks } from './types';
import { aggregatePortfolioGreeks } from './engine';

export interface HypotheticalPosition extends Omit<PortfolioPosition, 'id' | 'timestamp' | 'source'> {
  id?: string;
  source: 'SIMULATED';
}

export interface SimulatedPortfolioState {
  basePositions: PortfolioPosition[];
  hypotheticalPositions: PortfolioPosition[];
  allPositions: PortfolioPosition[];
  baseGreeks: PortfolioGreeks;
  simulatedGreeks: PortfolioGreeks;
  deltaChange: number;
  gammaChange: number;
  thetaChange: number;
  vegaChange: number;
}

export function simulatePortfolio(
  basePositions: PortfolioPosition[],
  hypotheticalPos: HypotheticalPosition[]
): SimulatedPortfolioState {
  
  const baseGreeks = aggregatePortfolioGreeks(basePositions);
  
  const hypotheticalPositions: PortfolioPosition[] = hypotheticalPos.map(p => ({
    ...p,
    id: p.id || `hypothetical-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
    source: 'SIMULATED'
  }));

  const allPositions = [...basePositions, ...hypotheticalPositions];
  const simulatedGreeks = aggregatePortfolioGreeks(allPositions);

  return {
    basePositions,
    hypotheticalPositions,
    allPositions,
    baseGreeks,
    simulatedGreeks,
    deltaChange: simulatedGreeks.dollarDelta - baseGreeks.dollarDelta,
    gammaChange: simulatedGreeks.dollarGamma - baseGreeks.dollarGamma,
    thetaChange: simulatedGreeks.dollarTheta - baseGreeks.dollarTheta,
    vegaChange: simulatedGreeks.dollarVega - baseGreeks.dollarVega
  };
}
