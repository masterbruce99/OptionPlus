import { OptionContract, Quote } from '../providers/MarketDataProvider';
import { ActivityCandidate, ActivityClassification, ActivityFlags } from './types';

interface ScanConfig {
  minVolume: number;
  minPremium: number; // For aggregate notional
  minActivityScore: number;
}

const DEFAULT_CONFIG: ScanConfig = {
  minVolume: 100,
  minPremium: 10000,
  minActivityScore: 20
};

export function analyzeActivity(
  chain: OptionContract[],
  quote: Quote,
  config: ScanConfig = DEFAULT_CONFIG
): ActivityCandidate[] {
  if (!chain || chain.length === 0) return [];

  // Chain-level aggregates
  const totalCallVolume = chain.filter(c => c.type === 'call').reduce((sum, c) => sum + (c.volume || 0), 0);
  const totalPutVolume = chain.filter(c => c.type === 'put').reduce((sum, c) => sum + (c.volume || 0), 0);
  const totalCallOi = chain.filter(c => c.type === 'call').reduce((sum, c) => sum + (c.openInterest || 0), 0);
  const totalPutOi = chain.filter(c => c.type === 'put').reduce((sum, c) => sum + (c.openInterest || 0), 0);

  const putCallVolumeRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : null;
  const putCallOiRatio = totalCallOi > 0 ? totalPutOi / totalCallOi : null;

  const candidates: ActivityCandidate[] = [];

  for (const contract of chain) {
    if (contract.volume === null || contract.volume < config.minVolume) {
      continue;
    }

    const volume = contract.volume;
    const oi = contract.openInterest || 0;
    
    // Volume/OI ratio
    const volumeToOiRatio = oi > 0 ? volume / oi : volume; // If OI is 0, ratio is essentially volume

    // Estimate aggregate premium
    // We use mid price if available, else last, else 0
    let referencePrice = 0;
    if (contract.bid !== null && contract.ask !== null && contract.bid > 0 && contract.ask >= contract.bid) {
      referencePrice = (contract.bid + contract.ask) / 2;
    } else if (contract.last !== null) {
      referencePrice = contract.last;
    }
    
    const aggregateNotionalPremium = referencePrice > 0 ? volume * referencePrice * 100 : null;

    if (aggregateNotionalPremium !== null && aggregateNotionalPremium < config.minPremium) {
      continue;
    }

    // Determine Classification & Score
    let score = 0;
    const reasons: string[] = [];
    
    if (oi > 0) {
      if (volumeToOiRatio > 3) {
        score += 40;
        reasons.push(`Volume is ${volumeToOiRatio.toFixed(1)}x open interest`);
      } else if (volumeToOiRatio > 1) {
        score += 20;
        reasons.push(`Volume exceeds open interest (${volumeToOiRatio.toFixed(1)}x)`);
      }
    } else {
      score += 10;
      reasons.push(`New activity (OI is 0)`);
    }

    if (aggregateNotionalPremium !== null) {
      if (aggregateNotionalPremium > 1000000) {
        score += 30;
        reasons.push(`Aggregate daily premium exceeds $1M`);
      } else if (aggregateNotionalPremium > 100000) {
        score += 15;
        reasons.push(`Aggregate daily premium exceeds $100k`);
      }
    }

    if (volume > 5000) {
      score += 30;
      reasons.push(`High absolute volume (>5000)`);
    } else if (volume > 1000) {
      score += 15;
      reasons.push(`Elevated absolute volume (>1000)`);
    }

    // Determine Classification String
    let classification: ActivityClassification = 'NORMAL ACTIVITY';
    if (score >= 70) {
      classification = 'HIGHLY UNUSUAL ACTIVITY';
    } else if (score >= 40) {
      classification = 'UNUSUAL ACTIVITY';
    } else if (score >= 20) {
      classification = 'ELEVATED ACTIVITY';
    }

    if (score < config.minActivityScore) {
      continue;
    }

    // Add required missing data warnings (Module 15 & 16)
    const flags: ActivityFlags = {
      sweepDetection: 'UNAVAILABLE',
      blockDetection: 'UNAVAILABLE',
      historicalVolume: 'UNAVAILABLE',
      historicalOi: 'UNAVAILABLE',
      historicalIv: 'UNAVAILABLE',
      individualTradeSize: 'UNAVAILABLE',
      bidAskCross: 'UNAVAILABLE'
    };

    // Data Quality Score
    // Since we only have daily aggregate metrics and no historical baseline, the max quality score is low
    // Base is 40. We add a bit if we have bid/ask and implied volatility.
    let dataQualityScore = 40; 
    if (contract.impliedVolatility !== null) dataQualityScore += 10;
    if (contract.bid !== null && contract.ask !== null) dataQualityScore += 10;

    candidates.push({
      contract,
      totalVolume: volume,
      openInterest: oi,
      volumeToOiRatio,
      putCallVolumeRatio,
      putCallOiRatio,
      aggregateNotionalPremium,
      classification,
      activityScore: Math.min(score, 100),
      dataQualityScore,
      flags,
      reasons
    });
  }

  // Sort by activity score descending
  return candidates.sort((a, b) => b.activityScore - a.activityScore);
}
