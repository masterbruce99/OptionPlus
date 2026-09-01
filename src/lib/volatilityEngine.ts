/**
 * Volatility Analysis Engine — Phase 5 Modules 19–20, 22–23
 *
 * Provides market regime assessment, IV context, volatility skew,
 * and term structure analysis from real option chain data.
 *
 * REAL-DATA RULE: All analysis is derived from provided market data.
 * When historical data is unavailable, the output explicitly states this.
 */

import { OptionContract } from './providers/MarketDataProvider';

// ============================================================
// Helpers
// ============================================================

/**
 * Finds the contract of the specified type with the strike closest
 * to the underlying price that has impliedVolatility > 0.
 *
 * @returns The ATM contract, or null if none found with valid IV.
 */
export function findATMContract(
  chain: OptionContract[],
  underlyingPrice: number,
  type: 'call' | 'put' = 'call'
): OptionContract | null {
  const candidates = chain.filter(c => c.type === type && c.impliedVolatility > 0);
  if (candidates.length === 0) return null;

  return candidates.reduce((best, current) =>
    Math.abs(current.strike - underlyingPrice) < Math.abs(best.strike - underlyingPrice)
      ? current
      : best
  );
}

/**
 * Extracts at-the-money implied volatility from the chain.
 *
 * @returns ATM IV as a decimal (e.g. 0.35 = 35%), or null if unavailable.
 */
export function extractATMIV(chain: OptionContract[], underlyingPrice: number): number | null {
  const atm = findATMContract(chain, underlyingPrice, 'call');
  if (atm && atm.impliedVolatility > 0) return atm.impliedVolatility;
  // Fallback to put
  const atmPut = findATMContract(chain, underlyingPrice, 'put');
  if (atmPut && atmPut.impliedVolatility > 0) return atmPut.impliedVolatility;
  return null;
}

// ============================================================
// Module 19: Market Regime
// ============================================================

export type TrendLabel = 'UPWARD TREND' | 'DOWNWARD TREND' | 'RANGE' | 'INSUFFICIENT DATA';
export type VolatilityLabel = 'HIGH VOLATILITY' | 'LOW VOLATILITY' | 'MODERATE VOLATILITY' | 'INSUFFICIENT DATA';

export interface MarketRegime {
  trendLabel: TrendLabel;
  trendMethodology: string;
  volatilityLabel: VolatilityLabel;
  volatilityMethodology: string;
  currentPrice: number;
  dailyChange: number;
  dailyChangePercent: number;
  volume: number;
  currentATMIV: number | null;
  dataSource: 'REAL MARKET DATA';
}

/**
 * Assesses the current market regime for a given underlying.
 *
 * Trend Methodology:
 * - Based on single-session price change percentage.
 * - > +1% → UPWARD TREND
 * - < -1% → DOWNWARD TREND
 * - Between -1% and +1% → RANGE
 * - If change data is missing → INSUFFICIENT DATA
 *
 * Volatility Methodology:
 * - Based on at-the-money implied volatility from the option chain.
 * - IV > 50% → HIGH VOLATILITY
 * - IV < 20% → LOW VOLATILITY
 * - Between → MODERATE VOLATILITY
 * - If no IV available → INSUFFICIENT DATA
 *
 * Limitations:
 * - Trend is based on a SINGLE session. This is not a multi-day trend analysis.
 * - Volatility classification thresholds are asset-class-dependent.
 *   50% IV may be normal for a biotech stock but extreme for an index ETF.
 * - Does not account for pre/post-market moves.
 */
export function assessMarketRegime(
  quote: { price: number; change: number; changePercentage: number; volume: number },
  chain: OptionContract[]
): MarketRegime {
  // Trend assessment
  let trendLabel: TrendLabel;
  if (quote.change === 0 && quote.changePercentage === 0) {
    trendLabel = 'INSUFFICIENT DATA';
  } else if (quote.changePercentage > 1) {
    trendLabel = 'UPWARD TREND';
  } else if (quote.changePercentage < -1) {
    trendLabel = 'DOWNWARD TREND';
  } else {
    trendLabel = 'RANGE';
  }

  const trendMethodology =
    'Based on single-session price change. A change > +1% is labeled UPWARD TREND, ' +
    '< -1% is DOWNWARD TREND, otherwise RANGE. This is a short-term indicator only.';

  // Volatility assessment
  const atmIV = extractATMIV(chain, quote.price);
  let volatilityLabel: VolatilityLabel;

  if (atmIV === null) {
    volatilityLabel = 'INSUFFICIENT DATA';
  } else if (atmIV > 0.50) {
    volatilityLabel = 'HIGH VOLATILITY';
  } else if (atmIV < 0.20) {
    volatilityLabel = 'LOW VOLATILITY';
  } else {
    volatilityLabel = 'MODERATE VOLATILITY';
  }

  const volatilityMethodology =
    'Based on at-the-money implied volatility from the nearest expiration option chain. ' +
    'IV > 50% is classified HIGH, < 20% is LOW, otherwise MODERATE. ' +
    'These thresholds may not be appropriate for all asset classes.';

  return {
    trendLabel,
    trendMethodology,
    volatilityLabel,
    volatilityMethodology,
    currentPrice: quote.price,
    dailyChange: quote.change,
    dailyChangePercent: quote.changePercentage,
    volume: quote.volume,
    currentATMIV: atmIV,
    dataSource: 'REAL MARKET DATA'
  };
}

// ============================================================
// Module 20: IV Context
// ============================================================

/**
 * Historical IV data structure.
 * This is a placeholder for future historical-data provider integration.
 */
export interface HistoricalIVData {
  dates: string[];
  values: number[];
}

export interface IVContext {
  currentATMIV: number | null;
  historicalIVAvailable: boolean;
  ivRank: number | null;
  ivPercentile: number | null;
  disclaimer: string;
  dataSource: 'REAL MARKET DATA' | 'INSUFFICIENT DATA';
}

/**
 * Builds IV context by comparing current ATM IV against historical data.
 *
 * IV Rank Formula: (currentIV - min) / (max - min) × 100
 *   Interpretation: Where the current IV sits relative to its historical range.
 *   100 = at the historical maximum. 0 = at the historical minimum.
 *
 * IV Percentile Formula: (count of historical values ≤ currentIV / total) × 100
 *   Interpretation: What percentage of historical observations were at or below current IV.
 *   90 = current IV is higher than 90% of historical observations.
 *
 * Limitations:
 * - Requires historical data from an external provider (not yet configured).
 * - Without historical data, IV Rank and Percentile are unavailable.
 * - Historical IV is backward-looking and does not predict future volatility.
 * - The quality of IV Rank/Percentile depends on the length and recency of the data set.
 */
export function getIVContext(
  chain: OptionContract[],
  underlyingPrice: number,
  historicalData?: HistoricalIVData
): IVContext {
  const currentATMIV = extractATMIV(chain, underlyingPrice);

  if (
    historicalData &&
    historicalData.values.length > 0 &&
    currentATMIV !== null
  ) {
    const min = Math.min(...historicalData.values);
    const max = Math.max(...historicalData.values);
    const range = max - min;

    const ivRank = range > 0
      ? Math.max(0, Math.min(100, ((currentATMIV - min) / range) * 100))
      : 50; // If all historical values are the same

    const belowCount = historicalData.values.filter(v => v <= currentATMIV).length;
    const ivPercentile = (belowCount / historicalData.values.length) * 100;

    return {
      currentATMIV,
      historicalIVAvailable: true,
      ivRank: Math.round(ivRank * 100) / 100,
      ivPercentile: Math.round(ivPercentile * 100) / 100,
      disclaimer:
        `IV Rank and Percentile based on ${historicalData.values.length} historical data points. ` +
        'Past volatility does not predict future volatility.',
      dataSource: 'REAL MARKET DATA'
    };
  }

  return {
    currentATMIV,
    historicalIVAvailable: false,
    ivRank: null,
    ivPercentile: null,
    disclaimer:
      'HISTORICAL IV CONTEXT UNAVAILABLE. Current IV shown is from today\'s option chain only. ' +
      'IV Rank and IV Percentile require historical volatility data which is not currently configured.',
    dataSource: currentATMIV !== null ? 'REAL MARKET DATA' : 'INSUFFICIENT DATA'
  };
}

// ============================================================
// Module 22: Volatility Skew
// ============================================================

export interface SkewPoint {
  strike: number;
  iv: number;
  type: 'call' | 'put';
  /** strike / underlyingPrice — values < 1 are OTM puts / ITM calls */
  moneyness: number;
}

/**
 * Calculates volatility skew data for visualization.
 *
 * Returns IV across all strikes for the given chain, enabling the user
 * to see how implied volatility varies by strike price.
 *
 * Limitations:
 * - Only includes contracts with IV > 0 (contracts without IV data are excluded).
 * - Skew is specific to a single expiration date.
 * - Bid/ask dynamics and low liquidity can distort IV calculations at extreme strikes.
 */
export function calculateVolatilitySkew(
  chain: OptionContract[],
  underlyingPrice: number
): SkewPoint[] {
  return chain
    .filter(c => c.impliedVolatility > 0)
    .map(c => ({
      strike: c.strike,
      iv: c.impliedVolatility,
      type: c.type,
      moneyness: underlyingPrice > 0 ? c.strike / underlyingPrice : 0
    }))
    .sort((a, b) => a.strike - b.strike);
}

// ============================================================
// Module 23: Term Structure
// ============================================================

export interface TermStructurePoint {
  expiration: string;
  daysToExpiration: number;
  atmIV: number;
}

/**
 * Calculates IV term structure across multiple expiration dates.
 *
 * Compares ATM implied volatility across expirations to visualize
 * whether near-term or far-term options are pricing in more uncertainty.
 *
 * Limitations:
 * - Requires option chains for multiple expirations (fetched separately).
 * - ATM IV is approximated using the call with the strike closest to the underlying price.
 * - Term structure can shift rapidly around events (earnings, dividends, etc.).
 * - Expirations with very low liquidity may produce unreliable IV estimates.
 */
export function calculateTermStructure(
  chainsByExpiration: Map<string, OptionContract[]>,
  underlyingPrice: number
): TermStructurePoint[] {
  const points: TermStructurePoint[] = [];

  chainsByExpiration.forEach((chain, expiration) => {
    const atmIV = extractATMIV(chain, underlyingPrice);
    if (atmIV === null || atmIV <= 0) return;

    // Calculate DTE using UTC
    const parts = expiration.split('-');
    if (parts.length !== 3) return;

    const expDate = new Date(Date.UTC(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
      16, 0, 0
    ));
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    const dte = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    points.push({
      expiration,
      daysToExpiration: dte,
      atmIV
    });
  });

  return points.sort((a, b) => a.daysToExpiration - b.daysToExpiration);
}
