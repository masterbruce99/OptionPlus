import { VolatilityContext, HistoricalPrice } from './types';
import { calculateRealizedVolatility } from './realizedVolatility';

export interface VolatilityAnalysisParams {
  currentIV: number | null;
  historicalIVs: number[]; // Array of historical IVs (oldest to newest)
  historicalPrices: HistoricalPrice[]; // Array of historical prices (oldest to newest)
  ivHistoryRequired: number; // Minimum data points required for rank/percentile
}

/**
 * Builds the Volatility Context, aggregating IV, RV, Rank, Percentile, and Spread.
 */
export function buildVolatilityContext(params: VolatilityAnalysisParams): VolatilityContext {
  const { currentIV, historicalIVs, historicalPrices, ivHistoryRequired } = params;

  // Realized Volatility
  const rv10 = calculateRealizedVolatility(historicalPrices, 10);
  const rv20 = calculateRealizedVolatility(historicalPrices, 20);
  const rv30 = calculateRealizedVolatility(historicalPrices, 30);

  // IV-RV Spread (Usually 30-day IV vs 20-day RV is standard benchmark)
  const ivRvSpread = (currentIV !== null && rv20 !== null) ? currentIV - rv20 : null;

  // IV Rank & Percentile
  let ivRank: number | null = null;
  let ivPercentile: number | null = null;

  const hasSufficientHistory = historicalIVs.length >= ivHistoryRequired;

  if (hasSufficientHistory && currentIV !== null) {
    const minIV = Math.min(...historicalIVs);
    const maxIV = Math.max(...historicalIVs);
    const range = maxIV - minIV;

    ivRank = range > 0
      ? Math.max(0, Math.min(100, ((currentIV - minIV) / range) * 100))
      : 50;

    const belowCount = historicalIVs.filter(v => v <= currentIV).length;
    ivPercentile = (belowCount / historicalIVs.length) * 100;
  }

  // Determine status
  let status: VolatilityContext['status'] = 'REAL DATA';
  if (currentIV === null) {
    status = 'UNAVAILABLE';
  } else if (!hasSufficientHistory) {
    status = 'INSUFFICIENT DATA';
  }

  const methodology = 'IV Rank compares current IV to historical extremes. IV Percentile measures the percentage of historical days below current IV. Realized Volatility is the annualized standard deviation of daily log returns.';
  const assumptions = [
    'Past volatility does not predict future volatility.',
    !hasSufficientHistory ? 'INSUFFICIENT HISTORICAL IV DATA: IV Rank and Percentile require more historical observations.' : 'Historical data used for Rank/Percentile relies on external provider accuracy.'
  ];

  return {
    status,
    currentIV,
    realizedVolatility10d: rv10,
    realizedVolatility20d: rv20,
    realizedVolatility30d: rv30,
    ivRvSpread,
    ivRank,
    ivPercentile,
    historicalObservations: historicalIVs.length,
    methodology,
    assumptions
  };
}
