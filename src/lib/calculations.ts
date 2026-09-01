export function calculateMidPrice(bid: number | null | undefined, ask: number | null | undefined): number | null {
  if (bid == null || ask == null || bid === 0 || ask === 0) return null;
  return (bid + ask) / 2;
}

export function calculateSpread(bid: number | null | undefined, ask: number | null | undefined): number | null {
  if (bid == null || ask == null) return null;
  return Math.abs(ask - bid);
}

export function calculateSpreadPercentage(bid: number | null | undefined, ask: number | null | undefined): number | null {
  const spread = calculateSpread(bid, ask);
  const mid = calculateMidPrice(bid, ask);
  if (spread == null || mid == null || mid === 0) return null;
  return spread / mid;
}

export function calculateIntrinsicValue(type: 'call' | 'put', strike: number | null | undefined, underlyingPrice: number | null | undefined): number | null {
  if (strike == null || underlyingPrice == null) return null;
  if (type === 'call') {
    return Math.max(0, underlyingPrice - strike);
  } else {
    return Math.max(0, strike - underlyingPrice);
  }
}

export function calculateExtrinsicValue(premium: number | null | undefined, intrinsic: number | null | undefined): number | null {
  if (premium == null || intrinsic == null) return null;
  return Math.max(0, premium - intrinsic);
}

export function calculateBreakEven(type: 'call' | 'put', strike: number | null | undefined, premium: number | null | undefined): number | null {
  if (strike == null || premium == null) return null;
  if (type === 'call') {
    return strike + premium;
  } else {
    return strike - premium;
  }
}

export function calculateDaysToExpiration(expirationDateString: string | null | undefined): number | null {
  if (!expirationDateString) return null;
  // Use UTC to avoid timezone issues when calculating differences in days.
  // The API returns YYYY-MM-DD.
  const parts = expirationDateString.split('-');
  if (parts.length !== 3) return null;
  
  const expDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 16, 0, 0)); // Expiring at market close roughly
  const now = new Date();
  
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return Math.max(0, Math.ceil(diffDays));
}

export function categorizeDTE(dte: number | null | undefined): string {
  if (dte == null) return 'Unknown';
  if (dte <= 7) return 'Very Short';
  if (dte <= 30) return 'Short';
  if (dte <= 90) return 'Medium';
  return 'Long';
}

export function assessLiquidity(volume: number | null | undefined, oi: number | null | undefined, spreadPct: number | null | undefined): 'High' | 'Medium' | 'Low' {
  if (volume == null && oi == null) return 'Low';
  
  const v = volume || 0;
  const o = oi || 0;
  const s = spreadPct || 0;

  if ((v > 1000 || o > 5000) && s < 0.05) return 'High';
  if ((v > 100 || o > 500) && s < 0.10) return 'Medium';
  if (s > 0.15) return 'Low';
  if (v < 10 && o < 50) return 'Low';
  
  return 'Medium';
}

export function getTradeDirection(type: 'call' | 'put'): 'Bullish' | 'Bearish' {
  return type === 'call' ? 'Bullish' : 'Bearish';
}
