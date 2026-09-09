import { PortfolioPosition, PortfolioGreeks, RiskWarning, ConcentrationReport, RiskLevel, PortfolioRiskProfile } from './types';

export function analyzeAssignmentRisk(positions: PortfolioPosition[]): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  const shortOptions = positions.filter(p => p.side === 'short' && (p.type === 'call' || p.type === 'put'));
  
  if (shortOptions.length > 0) {
    warnings.push({
      id: `assignment-risk-${Date.now()}`,
      type: 'ASSIGNMENT',
      severity: 'WARNING',
      message: 'Short option positions can be assigned according to the contract and market mechanics. This analysis does not predict when assignment will occur.',
      affectedPositions: shortOptions.map(p => p.id)
    });
  }
  return warnings;
}

export function analyzeExpirationRisk(positions: PortfolioPosition[]): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  
  const now = new Date().getTime();
  
  const nearTerm = positions.filter(p => {
    if (!p.expiration) return false;
    const expDate = new Date(p.expiration).getTime();
    const dte = (expDate - now) / (1000 * 60 * 60 * 24);
    return dte >= 0 && dte <= 7;
  });

  if (nearTerm.length > 0) {
    warnings.push({
      id: `expiration-risk-${Date.now()}`,
      type: 'EXPIRATION',
      severity: 'WARNING',
      message: 'Several positions expire around the same time (0-7 DTE), so portfolio risk can change rapidly around this date.',
      affectedPositions: nearTerm.map(p => p.id)
    });
  }

  return warnings;
}

export function analyzeExerciseRisk(positions: PortfolioPosition[]): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  const longOptions = positions.filter(p => p.side === 'long' && (p.type === 'call' || p.type === 'put'));
  
  if (longOptions.length > 0) {
    warnings.push({
      id: `exercise-risk-${Date.now()}`,
      type: 'EXERCISE',
      severity: 'INFO',
      message: 'You have the right to exercise these long options before expiration. This system does not automatically assume exercise.',
      affectedPositions: longOptions.map(p => p.id)
    });
  }
  return warnings;
}

export function analyzeGreekExposure(greeks: PortfolioGreeks, capitalThreshold: number = 10000): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  
  // Note: arbitrary thresholds just for demonstration purposes, user should configure this ideally.
  if (Math.abs(greeks.dollarDelta) > capitalThreshold) {
    warnings.push({
      id: `high-delta-${Date.now()}`,
      type: 'GREEK_EXPOSURE',
      severity: 'WARNING',
      message: 'HIGH DELTA EXPOSURE: The portfolio is highly sensitive to directional moves in the underlying.'
    });
  }
  
  if (Math.abs(greeks.dollarTheta) > capitalThreshold * 0.05) {
    warnings.push({
      id: `high-theta-${Date.now()}`,
      type: 'GREEK_EXPOSURE',
      severity: 'WARNING',
      message: 'HIGH THETA DECAY: The portfolio has significant sensitivity to time decay.'
    });
  }

  return warnings;
}

export function analyzeConcentrationRisk(report: ConcentrationReport, concentrationLimit: number = 0.5): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  
  const totalCapital = Object.values(report.underlying).reduce((sum, u) => sum + u.capital, 0);
  
  if (totalCapital <= 0) return warnings;

  for (const [underlying, data] of Object.entries(report.underlying)) {
    if (data.capital / totalCapital > concentrationLimit) {
      warnings.push({
        id: `concentration-underlying-${underlying}-${Date.now()}`,
        type: 'CONCENTRATION',
        severity: 'WARNING',
        message: `HIGH CONCENTRATION in underlying ${underlying}.`
      });
    }
  }

  return warnings;
}

export function analyzeDataQuality(positions: PortfolioPosition[]): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  
  const missingGreeks = positions.filter(p => !p.greeks && p.type !== 'stock');
  if (missingGreeks.length > 0) {
    warnings.push({
      id: `missing-greeks-${Date.now()}`,
      type: 'DATA_QUALITY',
      severity: 'WARNING',
      message: 'MISSING GREEKS: Some positions lack Greek values. Scenario modelling may be inaccurate.',
      affectedPositions: missingGreeks.map(p => p.id)
    });
  }

  const missingQuotes = positions.filter(p => 
    (p.currentBid === undefined || p.currentAsk === undefined) && 
    p.valuationMethod !== 'USER_DEFINED' && p.valuationMethod !== 'LAST'
  );
  if (missingQuotes.length > 0) {
    warnings.push({
      id: `missing-quotes-${Date.now()}`,
      type: 'DATA_QUALITY',
      severity: 'CRITICAL',
      message: 'MISSING QUOTES: Some positions are missing bid/ask quotes, affecting P/L accuracy.',
      affectedPositions: missingQuotes.map(p => p.id)
    });
  }

  const wideSpread = positions.filter(p => {
    if (p.currentBid === undefined || p.currentAsk === undefined) return false;
    if (p.currentAsk === 0) return false;
    const spreadPercent = (p.currentAsk - p.currentBid) / p.currentAsk;
    return spreadPercent > 0.20; // 20% spread
  });
  
  if (wideSpread.length > 0) {
    warnings.push({
      id: `wide-spread-${Date.now()}`,
      type: 'DATA_QUALITY',
      severity: 'WARNING',
      message: 'WIDE BID/ASK EXPOSURE: Some positions have wide spreads, execution risk is elevated.',
      affectedPositions: wideSpread.map(p => p.id)
    });
  }

  return warnings;
}

export function calculateDeltaHedge(portfolioDeltaShareEquivalent: number): number {
  // To offset delta, you need the opposite number of shares
  // -100 portfolio delta -> buy 100 shares -> hedge is 100
  // +100 portfolio delta -> short 100 shares -> hedge is -100
  return -portfolioDeltaShareEquivalent;
}

function determineRiskLevel(value: number, moderateThresh: number, highThresh: number, criticalThresh: number): RiskLevel {
  if (value >= criticalThresh) return 'CRITICAL';
  if (value >= highThresh) return 'HIGH';
  if (value >= moderateThresh) return 'MODERATE';
  return 'LOW';
}

export function calculateRiskProfile(
  greeks: PortfolioGreeks,
  concentration: ConcentrationReport,
  portfolioValue: number
): PortfolioRiskProfile {
  // Configurable thresholds could be passed in, but we'll use base thresholds as a fraction of portfolioValue if available
  // otherwise fallback to static defaults
  const baseValue = portfolioValue > 0 ? portfolioValue : 10000;
  
  // Directional (Delta)
  // Let's say > 20% of portfolio value in raw delta is high
  const deltaPct = Math.abs(greeks.dollarDelta) / baseValue;
  const directional = determineRiskLevel(deltaPct, 0.1, 0.25, 0.5);

  // Convexity (Gamma)
  const gammaPct = Math.abs(greeks.dollarGamma) / baseValue;
  const convexity = determineRiskLevel(gammaPct, 0.01, 0.03, 0.05);

  // Time Decay (Theta) - daily decay vs portfolio value
  const thetaPct = Math.abs(greeks.dollarTheta) / baseValue;
  const timeDecay = determineRiskLevel(thetaPct, 0.005, 0.01, 0.03);

  // Volatility (Vega) - 1% IV change impact vs portfolio value
  const vegaPct = Math.abs(greeks.dollarVega) / baseValue;
  const volatility = determineRiskLevel(vegaPct, 0.01, 0.03, 0.05);

  // Concentration
  let maxConc = 0;
  const totalCapital = Object.values(concentration.underlying).reduce((sum, u) => sum + u.capital, 0);
  if (totalCapital > 0) {
    for (const u of Object.values(concentration.underlying)) {
       const pct = u.capital / totalCapital;
       if (pct > maxConc) maxConc = pct;
    }
  }
  const concentrationLevel = determineRiskLevel(maxConc, 0.2, 0.4, 0.6);

  // Overall is max of all
  const levels = [directional, convexity, timeDecay, volatility, concentrationLevel];
  let overall: RiskLevel = 'LOW';
  if (levels.includes('CRITICAL')) overall = 'CRITICAL';
  else if (levels.includes('HIGH')) overall = 'HIGH';
  else if (levels.includes('MODERATE')) overall = 'MODERATE';

  return {
    directional,
    convexity,
    timeDecay,
    volatility,
    concentration: concentrationLevel,
    overall
  };
}
