import { PortfolioGreeks } from './types';
import { OptionChain } from '../data-infrastructure/types';
import { OptionContract } from '../providers/MarketDataProvider';

export type RiskMetric = 'DELTA' | 'GAMMA' | 'THETA' | 'VEGA';

export interface HedgeRequirement {
  metric: RiskMetric;
  currentExposure: number;
  targetExposure: number;
  requiredChange: number;
  description: string;
}

export interface HedgeCandidate {
  id: string;
  instrumentType: 'STOCK' | 'OPTION' | 'SPREAD';
  description: string;
  contracts: number; // For stock, this is shares
  estimatedCost: number | null; // Positive is debit, negative is credit
  expectedExposureChange: number;
  residualRisk: number;
  legs: {
    symbol: string;
    type: 'call' | 'put' | 'stock';
    side: 'long' | 'short';
    strike: number;
    expiration?: string;
    multiplier: number;
  }[];
  mathematicalBasis: string;
  dataQuality: 'COMPLETE' | 'INSUFFICIENT_DATA';
}

export interface HedgeComparisonResult {
  candidateId: string;
  candidateDescription: string;
  estimatedCost: number | null;
  deltaBefore: number;
  deltaAfter: number;
  gammaBefore: number;
  gammaAfter: number;
  thetaBefore: number;
  thetaAfter: number;
  vegaBefore: number;
  vegaAfter: number;
  residualRisk: number;
}

export function calculateHedgeRequirement(greeks: PortfolioGreeks, metric: RiskMetric, targetExposure: number = 0): HedgeRequirement {
  let currentExposure = 0;
  
  switch (metric) {
    case 'DELTA':
      currentExposure = greeks.dollarDelta;
      break;
    case 'GAMMA':
      currentExposure = greeks.dollarGamma;
      break;
    case 'THETA':
      currentExposure = greeks.dollarTheta;
      break;
    case 'VEGA':
      currentExposure = greeks.dollarVega;
      break;
  }

  const requiredChange = targetExposure - currentExposure;

  return {
    metric,
    currentExposure,
    targetExposure,
    requiredChange,
    description: `Requires ${requiredChange > 0 ? '+' : ''}${requiredChange.toFixed(2)} ${metric} to reach target ${targetExposure.toFixed(2)}`
  };
}

export function generateHedgeCandidates(
  requirement: HedgeRequirement, 
  underlyingPrice: number, 
  chain: OptionChain | null
): HedgeCandidate[] {
  const candidates: HedgeCandidate[] = [];
  
  if (requirement.metric === 'DELTA') {
    // requirement.requiredChange is in Dollar Delta
    // 1 share = 1 * underlyingPrice dollar delta
    const sharesNeeded = Math.round(requirement.requiredChange / underlyingPrice);
    if (sharesNeeded !== 0) {
      candidates.push({
        id: `hedge-stock-${sharesNeeded}`,
        instrumentType: 'STOCK',
        description: `${sharesNeeded > 0 ? 'Buy' : 'Short'} ${Math.abs(sharesNeeded)} Shares`,
        contracts: sharesNeeded,
        estimatedCost: sharesNeeded * underlyingPrice,
        expectedExposureChange: sharesNeeded * underlyingPrice,
        residualRisk: Math.abs(requirement.targetExposure - (requirement.currentExposure + (sharesNeeded * underlyingPrice))),
        legs: [{
          symbol: chain?.symbol || 'STOCK',
          type: 'stock',
          side: sharesNeeded > 0 ? 'long' : 'short',
          strike: 0,
          multiplier: 1
        }],
        mathematicalBasis: `Shares Delta = 1.0. 1 Share = $${underlyingPrice} delta. Quantity = Required Change ($${requirement.requiredChange.toFixed(2)}) / ${underlyingPrice} = ${sharesNeeded} shares.`,
        dataQuality: 'COMPLETE'
      });
    }

    // Option candidates (if chain is provided)
    if (chain && chain.expirations && chain.expirations.length > 0) {
       // Look for a near-term ATM option
       const firstExp = chain.expirations[0].date;
       const firstExpChain = chain.expirations[0].strikes;
       
       // Find strike closest to underlying
       let closestStrike = firstExpChain[0];
       let minDiff = Math.abs(closestStrike.strike - underlyingPrice);
       for (const strike of firstExpChain) {
         const diff = Math.abs(strike.strike - underlyingPrice);
         if (diff < minDiff) {
           closestStrike = strike;
           minDiff = diff;
         }
       }

       const isLongCall = requirement.requiredChange > 0; // Need positive delta -> buy call
       const isLongPut = requirement.requiredChange < 0; // Need negative delta -> buy put
       
       if (isLongCall && closestStrike.call) {
         const opt = closestStrike.call;
         const optDollarDelta = (opt.greeks?.delta || 0) * 100 * underlyingPrice;
         if (optDollarDelta > 0) {
            const contracts = Math.round(requirement.requiredChange / optDollarDelta);
            if (contracts > 0) {
              const cost = opt.ask ? opt.ask * 100 * contracts : null;
              candidates.push({
                id: `hedge-call-${contracts}`,
                instrumentType: 'OPTION',
                description: `Buy ${contracts} ${firstExp} ${closestStrike.strike} Call(s)`,
                contracts,
                estimatedCost: cost,
                expectedExposureChange: contracts * optDollarDelta,
                residualRisk: Math.abs(requirement.targetExposure - (requirement.currentExposure + (contracts * optDollarDelta))),
                legs: [{
                  symbol: chain.symbol,
                  type: 'call',
                  side: 'long',
                  strike: closestStrike.strike,
                  expiration: firstExp,
                  multiplier: 100
                }],
                mathematicalBasis: `Option Delta = ${opt.greeks?.delta || 0}. 1 Contract = $${optDollarDelta.toFixed(2)} dollar delta. Contracts needed = Required ($${requirement.requiredChange.toFixed(2)}) / $${optDollarDelta.toFixed(2)} = ${contracts}.`,
                dataQuality: (opt.ask !== null && opt.greeks?.delta) ? 'COMPLETE' : 'INSUFFICIENT_DATA'
              });
            }
         }
       }

       if (isLongPut && closestStrike.put) {
         const opt = closestStrike.put;
         const optDollarDelta = (opt.greeks?.delta || 0) * 100 * underlyingPrice; // Negative for puts
         if (optDollarDelta < 0) {
            const contracts = Math.round(requirement.requiredChange / optDollarDelta); // Negative / Negative = Positive
            if (contracts > 0) {
              const cost = opt.ask ? opt.ask * 100 * contracts : null;
              candidates.push({
                id: `hedge-put-${contracts}`,
                instrumentType: 'OPTION',
                description: `Buy ${contracts} ${firstExp} ${closestStrike.strike} Put(s)`,
                contracts,
                estimatedCost: cost,
                expectedExposureChange: contracts * optDollarDelta,
                residualRisk: Math.abs(requirement.targetExposure - (requirement.currentExposure + (contracts * optDollarDelta))),
                legs: [{
                  symbol: chain.symbol,
                  type: 'put',
                  side: 'long',
                  strike: closestStrike.strike,
                  expiration: firstExp,
                  multiplier: 100
                }],
                mathematicalBasis: `Option Delta = ${opt.greeks?.delta || 0}. 1 Contract = $${optDollarDelta.toFixed(2)} dollar delta. Contracts needed = Required ($${requirement.requiredChange.toFixed(2)}) / $${optDollarDelta.toFixed(2)} = ${contracts}.`,
                dataQuality: (opt.ask !== null && opt.greeks?.delta) ? 'COMPLETE' : 'INSUFFICIENT_DATA'
              });
            }
         }
       }
    }
  } else if (requirement.metric === 'GAMMA' || requirement.metric === 'THETA' || requirement.metric === 'VEGA') {
    if (chain && chain.expirations && chain.expirations.length > 0) {
       const firstExp = chain.expirations[0].date;
       const firstExpChain = chain.expirations[0].strikes;
       
       let closestStrike = firstExpChain[0];
       let minDiff = Math.abs(closestStrike.strike - underlyingPrice);
       for (const strike of firstExpChain) {
         const diff = Math.abs(strike.strike - underlyingPrice);
         if (diff < minDiff) {
           closestStrike = strike;
           minDiff = diff;
         }
       }

       const opt = closestStrike.call || closestStrike.put;
       const optType = closestStrike.call ? 'call' : 'put';
       
       if (opt) {
          let optDollarExposure = 0;
          const metricKey = requirement.metric.toLowerCase() as 'gamma' | 'theta' | 'vega';
          
          if (requirement.metric === 'GAMMA') {
             optDollarExposure = (opt.greeks?.gamma || 0) * 100 * underlyingPrice;
          } else if (requirement.metric === 'THETA') {
             optDollarExposure = (opt.greeks?.theta || 0) * 100;
          } else if (requirement.metric === 'VEGA') {
             optDollarExposure = (opt.greeks?.vega || 0) * 100;
          }

          if (optDollarExposure !== 0) {
             const contracts = Math.round(requirement.requiredChange / optDollarExposure);
             if (contracts !== 0) {
               const isLong = contracts > 0;
               const absContracts = Math.abs(contracts);
               const costEstimate = isLong 
                  ? (opt.ask !== null ? opt.ask * 100 * absContracts : null)
                  : (opt.bid !== null ? -(opt.bid * 100 * absContracts) : null);

               candidates.push({
                 id: `hedge-${requirement.metric.toLowerCase()}-${contracts}`,
                 instrumentType: 'OPTION',
                 description: `${isLong ? 'Buy' : 'Sell'} ${absContracts} ${firstExp} ${closestStrike.strike} ${optType === 'call' ? 'Call(s)' : 'Put(s)'}`,
                 contracts: absContracts,
                 estimatedCost: costEstimate,
                 expectedExposureChange: contracts * optDollarExposure,
                 residualRisk: Math.abs(requirement.targetExposure - (requirement.currentExposure + (contracts * optDollarExposure))),
                 legs: [{
                   symbol: chain.symbol,
                   type: optType,
                   side: isLong ? 'long' : 'short',
                   strike: closestStrike.strike,
                   expiration: firstExp,
                   multiplier: 100
                 }],
                 mathematicalBasis: `Option ${requirement.metric} = ${opt.greeks?.[metricKey] || 0}. 1 Contract = $${optDollarExposure.toFixed(2)} dollar ${requirement.metric.toLowerCase()}. Contracts needed = Required ($${requirement.requiredChange.toFixed(2)}) / $${optDollarExposure.toFixed(2)} = ${contracts}.`,
                 dataQuality: (opt.ask !== null && opt.bid !== null && opt.greeks && opt.greeks[metricKey] !== undefined && opt.greeks[metricKey] !== null) ? 'COMPLETE' : 'INSUFFICIENT_DATA'
               });
             }
          }
       }
    }
  }

  return candidates;
}

export function compareHedges(
  portfolioGreeks: PortfolioGreeks,
  candidates: HedgeCandidate[],
  chain: OptionChain | null,
  underlyingPrice: number
): HedgeComparisonResult[] {
  return candidates.map(c => {
    
    let deltaChange = 0;
    let gammaChange = 0;
    let thetaChange = 0;
    let vegaChange = 0;

    if (c.instrumentType === 'STOCK') {
       deltaChange = c.contracts * underlyingPrice; // 1 share = 1 * underlyingPrice dollar delta
       // stock has 0 gamma, theta, vega
    } else if (c.instrumentType === 'OPTION' && chain) {
       for (const leg of c.legs) {
          const expMatch = chain.expirations.find((e: { date: string, strikes: { strike: number, call?: OptionContract, put?: OptionContract }[] }) => e.date === leg.expiration);
          if (expMatch) {
             const strikeMatch = expMatch.strikes.find((s: { strike: number, call?: OptionContract, put?: OptionContract }) => s.strike === leg.strike);
             if (strikeMatch) {
                const opt = leg.type === 'call' ? strikeMatch.call : strikeMatch.put;
                if (opt && opt.greeks) {
                   const dir = leg.side === 'long' ? 1 : -1;
                   const multiplier = leg.multiplier || 100;
                   deltaChange += (opt.greeks.delta || 0) * multiplier * c.contracts * dir * underlyingPrice;
                   gammaChange += (opt.greeks.gamma || 0) * multiplier * c.contracts * dir * underlyingPrice; 
                   thetaChange += (opt.greeks.theta || 0) * multiplier * c.contracts * dir;
                   vegaChange += (opt.greeks.vega || 0) * multiplier * c.contracts * dir;
                }
             }
          }
       }
    }

    return {
      candidateId: c.id,
      candidateDescription: c.description,
      estimatedCost: c.estimatedCost,
      deltaBefore: portfolioGreeks.dollarDelta,
      deltaAfter: portfolioGreeks.dollarDelta + deltaChange,
      gammaBefore: portfolioGreeks.dollarGamma,
      gammaAfter: portfolioGreeks.dollarGamma + gammaChange,
      thetaBefore: portfolioGreeks.dollarTheta,
      thetaAfter: portfolioGreeks.dollarTheta + thetaChange,
      vegaBefore: portfolioGreeks.dollarVega,
      vegaAfter: portfolioGreeks.dollarVega + vegaChange,
      residualRisk: c.residualRisk
    };
  });
}
