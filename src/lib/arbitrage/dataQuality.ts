/**
 * Phase 4 — Data Quality Gate
 *
 * Validates market data before any arbitrage calculation proceeds.
 * Every field is checked independently; partial failures are flagged.
 *
 * Possible states: VALID | PARTIAL | STALE | INSUFFICIENT
 */

import { OptionContract } from '../providers/MarketDataProvider';
import { DataQuality, DataQualityStatus } from './types';
import { RateData, DividendData } from './types';

/** Maximum acceptable quote age in milliseconds (configurable) */
export const DEFAULT_MAX_QUOTE_AGE_MS = 5 * 60 * 1000; // 5 minutes

export interface QuoteAgeConfig {
  maxAgeMs: number;
}

/**
 * Validate a put-call pair and supporting market data.
 *
 * @param call - Call contract for this strike/expiration
 * @param put - Put contract for the same strike/expiration
 * @param underlyingPrice - Current stock price
 * @param rateData - Interest rate from rate provider
 * @param dividendData - Dividend data from dividend provider
 * @param quoteTimestamp - Optional timestamp of the quotes (ms since epoch)
 * @param ageConfig - Optional max age config
 */
export function validateArbitrageData(
  call: OptionContract | null,
  put: OptionContract | null,
  underlyingPrice: number | null,
  rateData: RateData,
  dividendData: DividendData,
  quoteTimestamp?: number,
  ageConfig: QuoteAgeConfig = { maxAgeMs: DEFAULT_MAX_QUOTE_AGE_MS }
): DataQuality {
  const issues: string[] = [];

  // Check underlying
  const underlyingValid =
    underlyingPrice !== null &&
    underlyingPrice !== undefined &&
    isFinite(underlyingPrice) &&
    underlyingPrice > 0;
  if (!underlyingValid) issues.push('Underlying price unavailable or invalid');

  // Check call quotes
  const callQuoteValid =
    call !== null &&
    typeof call.bid === 'number' &&
    typeof call.ask === 'number' &&
    isFinite(call.bid) &&
    isFinite(call.ask) &&
    call.ask >= call.bid &&
    call.bid >= 0 &&
    call.ask > 0;
  if (!callQuoteValid) issues.push('Call bid/ask invalid or missing');

  // Check put quotes
  const putQuoteValid =
    put !== null &&
    typeof put.bid === 'number' &&
    typeof put.ask === 'number' &&
    isFinite(put.bid) &&
    isFinite(put.ask) &&
    put.ask >= put.bid &&
    put.bid >= 0 &&
    put.ask > 0;
  if (!putQuoteValid) issues.push('Put bid/ask invalid or missing');

  // Check contract params match
  const contractParamsValid =
    call !== null &&
    put !== null &&
    call.strike === put.strike &&
    call.expiration === put.expiration &&
    call.underlying === put.underlying;
  if (call !== null && put !== null && !contractParamsValid) {
    issues.push('Call/put strike, expiration, or underlying mismatch');
  }

  // Check interest rate
  const interestRateValid = rateData.status === 'REAL_DATA' && isFinite(rateData.rate);
  if (!interestRateValid) issues.push('Interest rate unavailable: ' + rateData.source);

  // Check dividend data
  const dividendValid = dividendData.status !== 'UNAVAILABLE';
  if (!dividendValid) issues.push('Dividend data unavailable: ' + dividendData.source);

  // Check quote freshness
  let quotesFresh = true;
  if (quoteTimestamp !== undefined) {
    const age = Date.now() - quoteTimestamp;
    if (age > ageConfig.maxAgeMs) {
      quotesFresh = false;
      issues.push(`Quotes are ${Math.round(age / 1000)}s old (max: ${Math.round(ageConfig.maxAgeMs / 1000)}s)`);
    }
  } else {
    // Cannot determine freshness
    issues.push('Quote timestamp unavailable — freshness unverifiable');
  }

  // Compute overall status
  let status: DataQualityStatus;

  if (!underlyingValid || !callQuoteValid || !putQuoteValid || !contractParamsValid) {
    status = 'INSUFFICIENT';
  } else if (!quotesFresh) {
    status = 'STALE';
  } else if (!interestRateValid || !dividendValid) {
    status = 'PARTIAL';
  } else {
    status = 'VALID';
  }

  return {
    status,
    issues,
    underlyingValid,
    callQuoteValid,
    putQuoteValid,
    contractParamsValid: contractParamsValid || (call === null || put === null),
    interestRateValid,
    dividendValid,
  };
}

/**
 * Validate a simpler single-contract (for vertical bound checks).
 */
export function validateSingleContractData(
  contract: OptionContract | null,
  underlyingPrice: number | null
): DataQuality {
  const issues: string[] = [];

  const underlyingValid =
    underlyingPrice !== null && isFinite(underlyingPrice) && underlyingPrice > 0;
  if (!underlyingValid) issues.push('Underlying price unavailable');

  const callQuoteValid =
    contract !== null &&
    typeof contract.bid === 'number' &&
    typeof contract.ask === 'number' &&
    isFinite(contract.bid) &&
    isFinite(contract.ask) &&
    contract.ask >= contract.bid &&
    contract.bid >= 0;
  if (!callQuoteValid) issues.push('Contract bid/ask invalid or missing');

  const status: DataQualityStatus =
    underlyingValid && callQuoteValid ? 'VALID' : 'INSUFFICIENT';

  return {
    status,
    issues,
    underlyingValid,
    callQuoteValid,
    putQuoteValid: true, // N/A for single contract
    contractParamsValid: true,
    interestRateValid: true, // N/A
    dividendValid: true, // N/A
  };
}
