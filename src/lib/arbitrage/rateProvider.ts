/**
 * Phase 4 — Interest Rate & Dividend Providers
 *
 * Attempts to fetch risk-free rate from U.S. Treasury data.
 * If unavailable: returns UNAVAILABLE status — never silently substitutes zero.
 *
 * Dividend provider supports:
 *   REAL_DATA: fetched from market provider
 *   USER_INPUT: manually entered by user
 *   UNAVAILABLE: data not available
 */

import { RateData, RateStatus, DividendData, DividendStatus } from './types';

// ============================================================
// INTEREST RATE PROVIDER
// ============================================================

const TREASURY_API_URL =
  'https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/avg_interest_rates' +
  '?fields=record_date,avg_interest_rate_amt,security_type_desc' +
  '&filter=security_type_desc:eq:Treasury Bills&sort=-record_date&page[size]=5';

let _cachedRate: RateData | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch the current U.S. Treasury bill rate.
 * Returns UNAVAILABLE if the API is unreachable or data is invalid.
 * This is the risk-free rate used in put-call parity and box spread calculations.
 */
export async function fetchRiskFreeRate(): Promise<RateData> {
  const now = Date.now();
  if (_cachedRate && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _cachedRate;
  }

  try {
    const resp = await fetch(TREASURY_API_URL, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      return unavailableRate('Treasury API returned status ' + resp.status);
    }

    const json = await resp.json();
    const entries = json?.data;

    if (!Array.isArray(entries) || entries.length === 0) {
      return unavailableRate('Treasury API returned no data');
    }

    const latest = entries[0];
    const ratePercent = parseFloat(latest.avg_interest_rate_amt);

    if (isNaN(ratePercent)) {
      return unavailableRate('Treasury API returned non-numeric rate');
    }

    const result: RateData = {
      rate: ratePercent / 100,
      source: 'U.S. Treasury FiscalData API (T-Bill avg rate)',
      observationDate: latest.record_date,
      maturity: 'Treasury Bills',
      timestamp: now,
      status: 'REAL_DATA',
    };

    _cachedRate = result;
    _cacheTimestamp = now;
    return result;
  } catch {
    return unavailableRate('Treasury API request failed');
  }
}

function unavailableRate(reason: string): RateData {
  return {
    rate: 0,
    source: reason,
    observationDate: '',
    maturity: '',
    timestamp: Date.now(),
    status: 'UNAVAILABLE' as RateStatus,
  };
}

// ============================================================
// DIVIDEND PROVIDER
// ============================================================

export interface DividendInput {
  annualDividend?: number;
  source?: 'user' | 'market';
}

/**
 * Construct a DividendData object from available inputs.
 * Never silently substitutes zero for unknown dividends.
 *
 * @param stockPrice - Current underlying price (needed to compute yield)
 * @param input - User-provided or market-provided dividend data
 */
export function buildDividendData(
  stockPrice: number,
  input?: DividendInput
): DividendData {
  if (!input || input.annualDividend === undefined || input.annualDividend === null) {
    return {
      annualDividend: 0,
      continuousYield: 0,
      source: 'UNAVAILABLE — no dividend data provided',
      status: 'UNAVAILABLE' as DividendStatus,
    };
  }

  const yield_ = stockPrice > 0 ? input.annualDividend / stockPrice : 0;

  return {
    annualDividend: input.annualDividend,
    continuousYield: yield_,
    source: input.source === 'user' ? 'User input' : 'Market data provider',
    status: (input.source === 'user' ? 'USER_INPUT' : 'REAL_DATA') as DividendStatus,
  };
}

/**
 * Build a zero-dividend assumption with explicit labeling.
 * Use only when the user explicitly confirms the stock pays no dividend.
 */
export function buildZeroDividend(note: string): DividendData {
  return {
    annualDividend: 0,
    continuousYield: 0,
    source: `Assumed zero: ${note}`,
    status: 'USER_INPUT',
  };
}
