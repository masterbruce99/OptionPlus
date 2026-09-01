/**
 * A basic Black-Scholes pricing model for estimating "What If" scenarios.
 * NOTE: This is a purely theoretical MODEL ESTIMATE and does not predict future real market prices.
 */

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export interface BSParams {
  S: number; // Current underlying price
  K: number; // Strike price
  T: number; // Time to expiration in years
  r: number; // Risk-free interest rate (e.g., 0.05 for 5%)
  v: number; // Implied Volatility (e.g., 0.20 for 20%)
  type: 'call' | 'put';
}

/**
 * Calculates theoretical option price using Black-Scholes.
 */
export function calculateBlackScholes(params: BSParams): number {
  const { S, K, T, r, v, type } = params;
  
  if (T <= 0) {
    return type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  }

  const d1 = (Math.log(S / K) + (r + (v * v) / 2) * T) / (v * Math.sqrt(T));
  const d2 = d1 - v * Math.sqrt(T);

  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}
