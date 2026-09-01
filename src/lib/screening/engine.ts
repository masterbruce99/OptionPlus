import { OptionContract } from '../providers/marketDataProvider';
import { TradeLeg, StrategyAnalysis, analyzeLongCall, analyzeLongPut, analyzeVerticalSpread } from '../payoffEngine';
import { MarketView, ScreeningFilters, StrategyCandidate, ScoreCard } from './types';
import { calculateProbabilityOfProfit } from '../probability/probabilityOfProfit';
import { calculateProbabilities } from '../probability/probabilityEngine';
import { calculateExpectedMoveStraddle } from '../probability/expectedMove';
import { calculateLiquidityScore } from '../opportunityScoring';

const RISK_FREE_RATE = 0.05;

// Generate ID helper
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function getDaysToExpiration(expiration: string): number {
  const diff = new Date(expiration).getTime() - new Date().getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
}

function getMid(contract: OptionContract): number {
  return (contract.bid + contract.ask) / 2;
}

export function generateCandidates(
  chain: OptionContract[],
  underlyingPrice: number,
  view: MarketView,
  filters: ScreeningFilters
): StrategyCandidate[] {
  const candidates: StrategyCandidate[] = [];

  // 1. Filter chain based on DTE filters first to limit combinations
  const validExpirations = Array.from(new Set(chain.map(c => c.expiration))).filter(exp => {
    const dte = getDaysToExpiration(exp);
    return dte >= filters.minDte && dte <= filters.maxDte;
  });

  const validChain = chain.filter(c => validExpirations.includes(c.expiration));

  // Sort by strike to easily find adjacent strikes
  const calls = validChain.filter(c => c.type === 'call').sort((a, b) => a.strike - b.strike);
  const puts = validChain.filter(c => c.type === 'put').sort((a, b) => a.strike - b.strike);

  // Helper to process and score a candidate
  const processCandidate = (strategyName: string, legs: TradeLeg[], analysis: StrategyAnalysis, exp: string) => {
    const dte = getDaysToExpiration(exp);
    const t = dte / 365;

    // Reject based on capital & risk limits
    // Reject based on capital & risk limits
    if (analysis.capitalRequired > filters.maxCapital) return;
    if (analysis.maxLoss !== null && Math.abs(analysis.maxLoss) > filters.maxLoss) return;

    // Use average IV of legs for probability
    const avgIv = legs.reduce((sum, leg) => {
      const contract = validChain.find(c => c.strike === leg.strike && c.type === leg.type && c.expiration === exp);
      return sum + (contract?.impliedVolatility || 0);
    }, 0) / legs.length;

    // Score liquidity
    let totalLiq = 0;
    for (const leg of legs) {
      const contract = validChain.find(c => c.strike === leg.strike && c.type === leg.type && c.expiration === exp);
      if (contract) {
        totalLiq += calculateLiquidityScore([contract]).score;
      }
    }
    const liquidityScore = totalLiq / legs.length;

    if (filters.minLiquidityScore && liquidityScore < filters.minLiquidityScore) return;

    // Probability of Profit
    let pop: number | null = null;
    let matchExplanation: string[] = [];
    let conflictExplanation: string[] = [];
    let warningMessages: string[] = [];

    if (avgIv > 0 && analysis.breakEvens.length > 0) {
      const breakEven = analysis.breakEvens[0]; // simplistic approximation
      
      const probRes = calculateProbabilityOfProfit({
        S: underlyingPrice,
        T: t,
        r: RISK_FREE_RATE,
        v: avgIv,
        strategy: strategyName as any,
        breakEven
      });

      if (probRes.status === 'MODEL ESTIMATE' && probRes.probabilityAbove !== null && probRes.probabilityBelow !== null) {
        // Find which direction to use for POP
        if (['Long Call', 'Covered Call', 'Cash-Secured Put', 'Bull Call Spread', 'Bull Put Spread', 'Short Put'].includes(strategyName)) {
           pop = probRes.probabilityAbove;
        } else {
           pop = probRes.probabilityBelow;
        }
      } else {
        warningMessages.push('INSUFFICIENT DATA for Probability Estimate');
      }
    }

    if (filters.minProbabilityOfProfit !== undefined && pop !== null && pop < filters.minProbabilityOfProfit) return;

    // Score Card
    const scoreCard = scoreCandidate(strategyName, view, analysis, dte, pop, liquidityScore);
    
    // Evaluate Match Status
    let matchStatus: StrategyCandidate['matchStatus'] = 'DOES NOT MATCH';
    if (scoreCard.totalScore >= 80) matchStatus = 'MATCHES YOUR CRITERIA';
    else if (scoreCard.totalScore >= 50) matchStatus = 'WORTH INVESTIGATING';
    
    if (warningMessages.length > 0) matchStatus = 'INSUFFICIENT DATA';

    // Evaluate Consistency
    const consistency = evaluateThesisConsistency(strategyName, view, analysis, dte, pop);
    matchExplanation = consistency.matches;
    conflictExplanation = consistency.conflicts;

    candidates.push({
      id: generateId(),
      strategyName,
      underlying: 'UNKNOWN', // Can fill this from contract
      expiration: exp,
      legs,
      analysis,
      scoreCard,
      probabilityOfProfit: pop,
      liquidityScore,
      isArbitrage: false,
      matchStatus,
      matchExplanation,
      conflictExplanation,
      warningMessages
    });
  };


  validExpirations.forEach(exp => {
    const expCalls = calls.filter(c => c.expiration === exp);
    const expPuts = puts.filter(c => c.expiration === exp);

    // 1. Long Calls
    if (view.direction === 'BULLISH' || view.direction === 'STRONGLY BULLISH') {
      expCalls.forEach(call => {
        // Delta filter can be applied here. For simplicity, just use all valid ones for now.
        if (!call.greeks.delta || call.greeks.delta < 0.2 || call.greeks.delta > 0.8) return;
        
        const leg: TradeLeg = { id: call.strike.toString(), type: 'call', side: 'long', strike: call.strike, quantity: 1, entryPrice: call.ask, multiplier: 100 };
        try {
          const analysis = analyzeLongCall(leg);
          processCandidate('Long Call', [leg], analysis, exp);
        } catch (e) { console.error('Error analyzing Long Call:', e); }
      });
    }

    // 2. Long Puts
    if (view.direction === 'BEARISH' || view.direction === 'STRONGLY BEARISH') {
      expPuts.forEach(put => {
        if (!put.greeks.delta || put.greeks.delta > -0.2 || put.greeks.delta < -0.8) return;
        
        const leg: TradeLeg = { id: put.strike.toString(), type: 'put', side: 'long', strike: put.strike, quantity: 1, entryPrice: put.ask, multiplier: 100 };
        try {
          const analysis = analyzeLongPut(leg);
          processCandidate('Long Put', [leg], analysis, exp);
        } catch (e) {}
      });
    }

    // 3. Bull Call Spreads
    if (view.direction === 'BULLISH' || view.direction === 'STRONGLY BULLISH' || view.direction === 'NEUTRAL') {
      for (let i = 0; i < expCalls.length; i++) {
        for (let j = i + 1; j < expCalls.length; j++) {
          const buyCall = expCalls[i]; // lower strike
          const sellCall = expCalls[j]; // higher strike
          
          if (buyCall.ask === 0 || sellCall.bid === 0) continue;
          // Filter to reasonable spread width
          if (sellCall.strike - buyCall.strike > 50) continue;

          const leg1: TradeLeg = { id: 'l1', type: 'call', side: 'long', strike: buyCall.strike, quantity: 1, entryPrice: buyCall.ask, multiplier: 100 };
          const leg2: TradeLeg = { id: 'l2', type: 'call', side: 'short', strike: sellCall.strike, quantity: 1, entryPrice: sellCall.bid, multiplier: 100 };
          
          try {
            const analysis = analyzeVerticalSpread(leg1, leg2);
            analysis.name = 'Bull Call Spread';
            if (analysis.netDebitCredit >= 0) continue; // must be a debit
            processCandidate('Bull Call Spread', [leg1, leg2], analysis, exp);
          } catch (e) { console.error('Error analyzing Bull Call Spread:', e); }
        }
      }
    }

    // 4. Bear Put Spreads
    if (view.direction === 'BEARISH' || view.direction === 'STRONGLY BEARISH' || view.direction === 'NEUTRAL') {
      for (let i = 0; i < expPuts.length; i++) {
        for (let j = i + 1; j < expPuts.length; j++) {
          const sellPut = expPuts[i]; // lower strike
          const buyPut = expPuts[j]; // higher strike
          
          if (buyPut.ask === 0 || sellPut.bid === 0) continue;
          if (buyPut.strike - sellPut.strike > 50) continue;

          const leg1: TradeLeg = { id: 'l1', type: 'put', side: 'long', strike: buyPut.strike, quantity: 1, entryPrice: buyPut.ask, multiplier: 100 };
          const leg2: TradeLeg = { id: 'l2', type: 'put', side: 'short', strike: sellPut.strike, quantity: 1, entryPrice: sellPut.bid, multiplier: 100 };
          
          try {
            const analysis = analyzeVerticalSpread(leg1, leg2);
            analysis.name = 'Bear Put Spread';
            if (analysis.netDebitCredit >= 0) continue; 
            processCandidate('Bear Put Spread', [leg1, leg2], analysis, exp);
          } catch (e) {}
        }
      }
    }

    // 5. Bull Put Spreads (Credit)
    if (view.direction === 'BULLISH' || view.direction === 'STRONGLY BULLISH' || view.direction === 'NEUTRAL') {
      for (let i = 0; i < expPuts.length; i++) {
        for (let j = i + 1; j < expPuts.length; j++) {
          const buyPut = expPuts[i]; // lower strike
          const sellPut = expPuts[j]; // higher strike
          
          if (buyPut.ask === 0 || sellPut.bid === 0) continue;
          if (sellPut.strike - buyPut.strike > 50) continue;

          const leg1: TradeLeg = { id: 'l1', type: 'put', side: 'short', strike: sellPut.strike, quantity: 1, entryPrice: sellPut.bid, multiplier: 100 };
          const leg2: TradeLeg = { id: 'l2', type: 'put', side: 'long', strike: buyPut.strike, quantity: 1, entryPrice: buyPut.ask, multiplier: 100 };
          
          try {
            const analysis = analyzeVerticalSpread(leg1, leg2);
            analysis.name = 'Bull Put Spread';
            if (analysis.netDebitCredit <= 0) continue; // must be credit
            processCandidate('Bull Put Spread', [leg1, leg2], analysis, exp);
          } catch (e) {}
        }
      }
    }

    // 6. Bear Call Spreads (Credit)
    if (view.direction === 'BEARISH' || view.direction === 'STRONGLY BEARISH' || view.direction === 'NEUTRAL') {
      for (let i = 0; i < expCalls.length; i++) {
        for (let j = i + 1; j < expCalls.length; j++) {
          const sellCall = expCalls[i]; // lower strike
          const buyCall = expCalls[j]; // higher strike
          
          if (buyCall.ask === 0 || sellCall.bid === 0) continue;
          if (buyCall.strike - sellCall.strike > 50) continue;

          const leg1: TradeLeg = { id: 'l1', type: 'call', side: 'short', strike: sellCall.strike, quantity: 1, entryPrice: sellCall.bid, multiplier: 100 };
          const leg2: TradeLeg = { id: 'l2', type: 'call', side: 'long', strike: buyCall.strike, quantity: 1, entryPrice: buyCall.ask, multiplier: 100 };
          
          try {
            const analysis = analyzeVerticalSpread(leg1, leg2);
            analysis.name = 'Bear Call Spread';
            if (analysis.netDebitCredit <= 0) continue; 
            processCandidate('Bear Call Spread', [leg1, leg2], analysis, exp);
          } catch (e) {}
        }
      }
    }

  });

  return candidates.sort((a, b) => b.scoreCard.totalScore - a.scoreCard.totalScore);
}

function scoreCandidate(
  strategyName: string, 
  view: MarketView, 
  analysis: StrategyAnalysis, 
  dte: number, 
  pop: number | null, 
  liquidity: number
): ScoreCard {
  let directionFit = 50;
  let timeFit = 50;
  let volatilityFit = 50;
  let riskFit = 100; // Defined risk gets 100
  
  if (analysis.maxLoss === null) riskFit = 0; // Undefined risk
  else if (analysis.maxLoss < 500) riskFit = 80;

  // Direction logic
  if (['Long Call', 'Bull Call Spread', 'Bull Put Spread', 'Cash-Secured Put'].includes(strategyName)) {
    if (view.direction === 'STRONGLY BULLISH') directionFit = 100;
    else if (view.direction === 'BULLISH') directionFit = 80;
    else if (view.direction === 'NEUTRAL') directionFit = 50;
    else directionFit = 0;
  } else if (['Long Put', 'Bear Put Spread', 'Bear Call Spread'].includes(strategyName)) {
    if (view.direction === 'STRONGLY BEARISH') directionFit = 100;
    else if (view.direction === 'BEARISH') directionFit = 80;
    else if (view.direction === 'NEUTRAL') directionFit = 50;
    else directionFit = 0;
  }

  // Time Logic
  if (view.timeHorizon === 'VERY SHORT') timeFit = dte <= 7 ? 100 : dte <= 14 ? 80 : 20;
  if (view.timeHorizon === 'SHORT') timeFit = (dte > 7 && dte <= 30) ? 100 : 50;
  if (view.timeHorizon === 'MEDIUM') timeFit = (dte > 30 && dte <= 90) ? 100 : 50;
  if (view.timeHorizon === 'LONG') timeFit = (dte > 90) ? 100 : 20;

  // Volatility Logic
  if (view.volatilityView === 'EXPECT IV UP') {
    if (['Long Call', 'Long Put'].includes(strategyName)) volatilityFit = 100; // Long Vega
    if (['Bull Put Spread', 'Bear Call Spread'].includes(strategyName)) volatilityFit = 20; // Short Vega
  } else if (view.volatilityView === 'EXPECT IV DOWN') {
    if (['Long Call', 'Long Put'].includes(strategyName)) volatilityFit = 20; 
    if (['Bull Put Spread', 'Bear Call Spread'].includes(strategyName)) volatilityFit = 100;
  }

  const weights = { direction: 0.4, time: 0.2, volatility: 0.1, risk: 0.1, liquidity: 0.1, capital: 0.1 };
  
  const totalScore = Math.round(
    directionFit * weights.direction +
    timeFit * weights.time +
    volatilityFit * weights.volatility +
    riskFit * weights.risk +
    liquidity * weights.liquidity +
    100 * weights.capital
  );

  return { directionFit, timeFit, volatilityFit, riskFit, liquidity, capitalFit: 100, totalScore };
}

function evaluateThesisConsistency(
  strategyName: string, 
  view: MarketView, 
  analysis: StrategyAnalysis, 
  dte: number, 
  pop: number | null
): { matches: string[], conflicts: string[] } {
  const matches: string[] = [];
  const conflicts: string[] = [];

  const isBullish = ['Long Call', 'Bull Call Spread', 'Bull Put Spread', 'Cash-Secured Put'].includes(strategyName);
  const isBearish = ['Long Put', 'Bear Put Spread', 'Bear Call Spread'].includes(strategyName);

  if (isBullish && view.direction.includes('BULLISH')) {
    matches.push("Direction: The strategy benefits from an upward move.");
  } else if (isBearish && view.direction.includes('BEARISH')) {
    matches.push("Direction: The strategy benefits from a downward move.");
  } else if (view.direction !== 'NEUTRAL') {
    conflicts.push(`Direction: Strategy is ${isBullish ? 'Bullish' : isBearish ? 'Bearish' : 'Neutral'}, but thesis is ${view.direction}.`);
  }

  if (analysis.maxLoss !== null) {
    matches.push("Risk: The trade has strictly defined risk.");
  } else {
    conflicts.push("Risk: The trade has undefined downside risk.");
  }

  if (pop !== null && pop > 50) {
    matches.push(`Probability: High probability of profit (${Math.round(pop)}%).`);
  }

  return { matches, conflicts };
}
