import { HistoricalPrice } from './types';

/**
 * Calculates realized volatility (historical volatility) from an array of daily closing prices.
 * Formula: Standard Deviation of logarithmic returns, annualized.
 * Annualization factor assumes 252 trading days.
 * 
 * @param prices Array of historical prices ordered from oldest to newest.
 * @param windowDays Number of trading days to calculate over (e.g. 20)
 * @returns Annualized realized volatility as a decimal (e.g. 0.15 for 15%), or null if insufficient data.
 */
export function calculateRealizedVolatility(prices: HistoricalPrice[], windowDays: number): number | null {
  if (prices.length <= windowDays) {
    return null; // INSUFFICIENT DATA
  }

  // Take the most recent `windowDays + 1` prices to get `windowDays` returns
  const recentPrices = prices.slice(-(windowDays + 1));
  const returns: number[] = [];

  for (let i = 1; i < recentPrices.length; i++) {
    const p0 = recentPrices[i - 1].close;
    const p1 = recentPrices[i].close;
    if (p0 <= 0 || p1 <= 0) return null; // Invalid data
    
    // Logarithmic return: ln(P_t / P_{t-1})
    returns.push(Math.log(p1 / p0));
  }

  if (returns.length === 0) return null;

  // Calculate Mean
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate Variance (sample variance)
  const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / (returns.length - 1); // Bessel's correction

  // Standard Deviation
  const stdDev = Math.sqrt(variance);

  // Annualize (assuming 252 trading days)
  const annualizedVolatility = stdDev * Math.sqrt(252);

  return annualizedVolatility;
}
