import { ExpectedMove } from './types';

/**
 * Calculates Expected Move based on the ATM straddle price.
 * 
 * @param underlyingPrice Current underlying price
 * @param atmCallAsk Ask price of the ATM call
 * @param atmPutAsk Ask price of the ATM put
 * @returns ExpectedMove object
 */
export function calculateStraddleExpectedMove(
  underlyingPrice: number,
  atmCallAsk: number,
  atmPutAsk: number
): ExpectedMove {
  if (underlyingPrice <= 0 || atmCallAsk <= 0 || atmPutAsk <= 0) {
    return {
      status: 'INSUFFICIENT DATA',
      value: 0,
      percentage: 0,
      impliedRangeLow: 0,
      impliedRangeHigh: 0,
      methodology: 'Market straddle prices missing or invalid.',
      source: '',
      assumptions: []
    };
  }

  const expectedMove = atmCallAsk + atmPutAsk;
  const percentage = expectedMove / underlyingPrice;

  return {
    status: 'REAL DATA',
    value: expectedMove,
    percentage,
    impliedRangeLow: underlyingPrice - expectedMove,
    impliedRangeHigh: underlyingPrice + expectedMove,
    methodology: 'Market-implied expected move derived from the combined ask prices of the At-The-Money Straddle.',
    source: 'Market Option Chain Prices',
    assumptions: [
      'MARKET-IMPLIED EXPECTED MOVE: This represents what the options market is currently pricing in.',
      'This is not a prediction or a probability guarantee of future price action.'
    ]
  };
}

/**
 * Calculates Expected Move using the standard volatility formula (1 standard deviation).
 * EM = S * IV * sqrt(DTE / 365)
 * 
 * @param underlyingPrice Current underlying price
 * @param iv Implied Volatility (decimal)
 * @param daysToExpiration DTE
 * @returns ExpectedMove object
 */
export function calculateVolatilityExpectedMove(
  underlyingPrice: number,
  iv: number,
  daysToExpiration: number
): ExpectedMove {
  if (underlyingPrice <= 0 || iv <= 0 || daysToExpiration < 0) {
    return {
      status: 'INSUFFICIENT DATA',
      value: 0,
      percentage: 0,
      impliedRangeLow: 0,
      impliedRangeHigh: 0,
      methodology: 'Missing valid price, volatility, or expiration data.',
      source: '',
      assumptions: []
    };
  }

  // 1 Standard Deviation Expected Move
  const expectedMove = underlyingPrice * iv * Math.sqrt(daysToExpiration / 365);
  const percentage = expectedMove / underlyingPrice;

  return {
    status: 'MODEL ESTIMATE',
    value: expectedMove,
    percentage,
    impliedRangeLow: underlyingPrice - expectedMove,
    impliedRangeHigh: underlyingPrice + expectedMove,
    methodology: 'Model estimate based on standard 1-standard-deviation volatility formula (68% probability under lognormal distribution).',
    source: 'Calculated from Implied Volatility',
    assumptions: [
      'MODEL ESTIMATE: Assumes lognormal distribution and constant volatility.',
      'Translates approximately to a 68% probability that the price remains within the implied range, under theoretical model conditions.'
    ]
  };
}
