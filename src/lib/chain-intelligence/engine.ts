import { OptionContract } from '../providers/MarketDataProvider';
import { ChainQualityMetrics, DeltaBucket, StrikeDistance, HypotheticalPosition, SimulatedImpact } from './types';

// Use the existing calculation functions
export function calculateSpreadPercentage(bid: number | null | undefined, ask: number | null | undefined): number | null {
  if (bid == null || ask == null || bid === 0 || ask === 0) return null;
  const spread = Math.abs(ask - bid);
  const mid = (bid + ask) / 2;
  if (mid === 0) return null;
  return spread / mid;
}

export function calculateChainQuality(chain: OptionContract[]): ChainQualityMetrics {
  let totalContracts = 0;
  let quotedContracts = 0;
  let totalVolume = 0;
  let totalOpenInterest = 0;
  const spreadPercentages: number[] = [];

  for (const contract of chain) {
    totalContracts++;
    
    if (contract.volume != null) totalVolume += contract.volume;
    if (contract.openInterest != null) totalOpenInterest += contract.openInterest;

    if (contract.bid != null && contract.ask != null && contract.bid > 0 && contract.ask > 0) {
      quotedContracts++;
      const spreadPct = calculateSpreadPercentage(contract.bid, contract.ask);
      if (spreadPct != null) {
        spreadPercentages.push(spreadPct);
      }
    }
  }

  spreadPercentages.sort((a, b) => a - b);
  
  let medianSpreadPct: number | null = null;
  let averageSpreadPct: number | null = null;

  if (spreadPercentages.length > 0) {
    const sum = spreadPercentages.reduce((a, b) => a + b, 0);
    averageSpreadPct = sum / spreadPercentages.length;
    
    const mid = Math.floor(spreadPercentages.length / 2);
    if (spreadPercentages.length % 2 === 0) {
      medianSpreadPct = (spreadPercentages[mid - 1] + spreadPercentages[mid]) / 2;
    } else {
      medianSpreadPct = spreadPercentages[mid];
    }
  }

  return {
    totalContracts,
    quotedContracts,
    averageSpreadPct,
    medianSpreadPct,
    totalVolume,
    totalOpenInterest,
    timestamp: 'REAL DATA (Provider Timestamp)'
  };
}

export function bucketByDelta(chain: OptionContract[]): DeltaBucket[] {
  const buckets: DeltaBucket[] = [
    { range: '0.00 - 0.20', min: 0.00, max: 0.20, count: 0, avgIV: 0, avgTheta: 0, avgVega: 0, avgSpreadPct: 0, totalVolume: 0, totalOI: 0 },
    { range: '0.20 - 0.40', min: 0.20, max: 0.40, count: 0, avgIV: 0, avgTheta: 0, avgVega: 0, avgSpreadPct: 0, totalVolume: 0, totalOI: 0 },
    { range: '0.40 - 0.60', min: 0.40, max: 0.60, count: 0, avgIV: 0, avgTheta: 0, avgVega: 0, avgSpreadPct: 0, totalVolume: 0, totalOI: 0 },
    { range: '0.60 - 0.80', min: 0.60, max: 0.80, count: 0, avgIV: 0, avgTheta: 0, avgVega: 0, avgSpreadPct: 0, totalVolume: 0, totalOI: 0 },
    { range: '0.80 - 1.00', min: 0.80, max: 1.00, count: 0, avgIV: 0, avgTheta: 0, avgVega: 0, avgSpreadPct: 0, totalVolume: 0, totalOI: 0 }
  ];

  // Temporary accumulators for averages
  const accumulators = buckets.map(() => ({ ivSum: 0, ivCount: 0, thetaSum: 0, thetaCount: 0, vegaSum: 0, vegaCount: 0, spreadSum: 0, spreadCount: 0 }));

  for (const contract of chain) {
    if (contract.greeks?.delta != null) {
      const absDelta = Math.abs(contract.greeks.delta);
      const bucketIdx = buckets.findIndex(b => absDelta >= b.min && absDelta <= b.max);
      
      if (bucketIdx !== -1) {
        const b = buckets[bucketIdx];
        const acc = accumulators[bucketIdx];
        
        b.count++;
        b.totalVolume += contract.volume || 0;
        b.totalOI += contract.openInterest || 0;

        if (contract.impliedVolatility != null) {
          acc.ivSum += contract.impliedVolatility;
          acc.ivCount++;
        }
        if (contract.greeks.theta != null) {
          acc.thetaSum += contract.greeks.theta;
          acc.thetaCount++;
        }
        if (contract.greeks.vega != null) {
          acc.vegaSum += contract.greeks.vega;
          acc.vegaCount++;
        }
        const spreadPct = calculateSpreadPercentage(contract.bid, contract.ask);
        if (spreadPct != null) {
          acc.spreadSum += spreadPct;
          acc.spreadCount++;
        }
      }
    }
  }

  // Finalize averages
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    const acc = accumulators[i];
    b.avgIV = acc.ivCount > 0 ? acc.ivSum / acc.ivCount : null;
    b.avgTheta = acc.thetaCount > 0 ? acc.thetaSum / acc.thetaCount : null;
    b.avgVega = acc.vegaCount > 0 ? acc.vegaSum / acc.vegaCount : null;
    b.avgSpreadPct = acc.spreadCount > 0 ? acc.spreadSum / acc.spreadCount : null;
  }

  return buckets;
}

export function calculateStrikeDistance(
  spot: number | null, 
  strike: number, 
  premium: number | null, 
  type: 'call' | 'put', 
  expectedMoveUpper?: number, 
  expectedMoveLower?: number
): StrikeDistance {
  if (spot == null || spot === 0) {
    return { absoluteSpot: null, percentageSpot: null, absoluteBreakeven: null, percentageBreakeven: null, distanceFromExpectedMoveBoundary: null };
  }

  const absoluteSpot = strike - spot;
  const percentageSpot = absoluteSpot / spot;

  let absoluteBreakeven: number | null = null;
  let percentageBreakeven: number | null = null;

  if (premium != null) {
    const be = type === 'call' ? strike + premium : strike - premium;
    absoluteBreakeven = be - spot;
    percentageBreakeven = absoluteBreakeven / spot;
  }

  let distanceFromExpectedMoveBoundary: number | null = null;
  if (type === 'call' && expectedMoveUpper != null) {
    distanceFromExpectedMoveBoundary = strike - expectedMoveUpper; // Positive if strike is above EM boundary
  } else if (type === 'put' && expectedMoveLower != null) {
    distanceFromExpectedMoveBoundary = strike - expectedMoveLower; // Negative if strike is below EM boundary
  }

  return {
    absoluteSpot,
    percentageSpot,
    absoluteBreakeven,
    percentageBreakeven,
    distanceFromExpectedMoveBoundary
  };
}

export function simulatePortfolioImpact(
  currentPortfolio: OptionContract[], 
  simulation: HypotheticalPosition
): SimulatedImpact {
  
  // Calculate Current Greeks
  let currentDelta = 0;
  let currentGamma = 0;
  let currentTheta = 0;
  let currentVega = 0;

  for (const c of currentPortfolio) {
    // Assuming quantity is 1 for simplicity of this generic portfolio, but normally we'd need actual quantities
    // For this module, we just simulate the change
    if (c.greeks) {
      currentDelta += c.greeks.delta || 0;
      currentGamma += c.greeks.gamma || 0;
      currentTheta += c.greeks.theta || 0;
      currentVega += c.greeks.vega || 0;
    }
  }

  // Calculate Impact
  let impactDelta = 0;
  let impactGamma = 0;
  let impactTheta = 0;
  let impactVega = 0;
  
  const g = simulation.contract.greeks;
  if (g) {
    impactDelta = (g.delta || 0) * simulation.quantity * 100; // * 100 multiplier for dollar delta
    impactGamma = (g.gamma || 0) * simulation.quantity * 100;
    impactTheta = (g.theta || 0) * simulation.quantity * 100;
    impactVega = (g.vega || 0) * simulation.quantity * 100;
  }

  let capitalRequired = 0;
  const price = (simulation.contract.bid != null && simulation.contract.ask != null) 
    ? (simulation.quantity > 0 ? simulation.contract.ask : simulation.contract.bid) 
    : 0;
  
  capitalRequired = price * simulation.quantity * 100;

  return {
    currentDelta,
    newDelta: currentDelta + impactDelta,
    currentGamma,
    newGamma: currentGamma + impactGamma,
    currentTheta,
    newTheta: currentTheta + impactTheta,
    currentVega,
    newVega: currentVega + impactVega,
    capitalRequired
  };
}
