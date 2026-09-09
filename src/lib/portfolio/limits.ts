import { PortfolioGreeks, PortfolioPosition, ConcentrationReport } from './types';
import { Alert } from '../alerts/types'; // Assuming we integrate with AlertEngine

export interface PortfolioLimit {
  id: string;
  metric: 'DELTA' | 'GAMMA' | 'VEGA' | 'THETA' | 'MAX_LOSS' | 'MAX_POSITION_SIZE' | 'UNDERLYING_CONCENTRATION' | 'EXPIRATION_CONCENTRATION' | 'EVENT_EXPOSURE';
  threshold: number;
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_THAN_EQUAL' | 'LESS_THAN_EQUAL';
  severity: 'WARNING' | 'CRITICAL';
  enabled: boolean;
}

const LIMITS_KEY = 'optionplus_portfolio_limits';

export function getPortfolioLimits(): PortfolioLimit[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LIMITS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse portfolio limits', e);
    return [];
  }
}

export function savePortfolioLimits(limits: PortfolioLimit[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LIMITS_KEY, JSON.stringify(limits));
  }
}

export function evaluatePortfolioLimits(
  positions: PortfolioPosition[], 
  greeks: PortfolioGreeks,
  concentration: ConcentrationReport,
  limits: PortfolioLimit[]
): Alert[] {
  const alerts: Alert[] = [];
  const now = Date.now();

  for (const limit of limits) {
    if (!limit.enabled) continue;

    let valueToCompare: number | null = null;
    let description = '';

    switch (limit.metric) {
      case 'DELTA':
        valueToCompare = Math.abs(greeks.dollarDelta);
        description = `Absolute Dollar Delta ($${valueToCompare.toFixed(2)})`;
        break;
      case 'GAMMA':
        valueToCompare = Math.abs(greeks.dollarGamma);
        description = `Absolute Dollar Gamma ($${valueToCompare.toFixed(2)})`;
        break;
      case 'VEGA':
        valueToCompare = Math.abs(greeks.dollarVega);
        description = `Absolute Dollar Vega ($${valueToCompare.toFixed(2)})`;
        break;
      case 'THETA':
        valueToCompare = Math.abs(greeks.dollarTheta);
        description = `Absolute Dollar Theta ($${valueToCompare.toFixed(2)})`;
        break;
      case 'MAX_LOSS':
        let unrealized = 0;
        for (const pos of positions) {
           let mark = pos.currentLast ?? pos.currentBid ?? pos.entryPrice;
           if (pos.valuationMethod === 'MID' && pos.currentBid !== undefined && pos.currentAsk !== undefined) {
             mark = (pos.currentBid + pos.currentAsk) / 2;
           }
           const dir = pos.side === 'long' ? 1 : -1;
           unrealized += (mark - pos.entryPrice) * dir * pos.contracts * pos.multiplier;
        }
        if (unrealized < 0) {
          valueToCompare = Math.abs(unrealized);
          description = `Portfolio Unrealized Loss ($${valueToCompare.toFixed(2)})`;
        }
        break;
      case 'MAX_POSITION_SIZE':
        let maxPos = 0;
        for (const pos of positions) {
           const size = pos.entryPrice * pos.contracts * pos.multiplier;
           if (size > maxPos) maxPos = size;
        }
        valueToCompare = maxPos;
        description = `Max Position Size ($${maxPos.toFixed(2)})`;
        break;
      case 'UNDERLYING_CONCENTRATION':
        let maxConc = 0;
        const totalCapital = Object.values(concentration.underlying).reduce((sum, u) => sum + u.capital, 0);
        if (totalCapital > 0) {
          for (const u of Object.values(concentration.underlying)) {
             const pct = u.capital / totalCapital;
             if (pct > maxConc) maxConc = pct;
          }
        }
        valueToCompare = maxConc * 100; // Store as percentage 0-100
        description = `Max Underlying Concentration (${valueToCompare.toFixed(1)}%)`;
        break;
    }

    if (valueToCompare !== null) {
      let triggered = false;
      if (limit.operator === 'GREATER_THAN' && valueToCompare > limit.threshold) triggered = true;
      if (limit.operator === 'LESS_THAN' && valueToCompare < limit.threshold) triggered = true;
      if (limit.operator === 'GREATER_THAN_EQUAL' && valueToCompare >= limit.threshold) triggered = true;
      if (limit.operator === 'LESS_THAN_EQUAL' && valueToCompare <= limit.threshold) triggered = true;

      if (triggered) {
        alerts.push({
          id: `limit-${limit.id}-${now}`,
          type: 'PORTFOLIO',
          symbol: 'PORTFOLIO',
          priority: limit.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          message: `Portfolio Limit Exceeded: ${description} is ${limit.operator} threshold of ${limit.threshold}`,
          timestamp: now,
          status: 'TRIGGERED',
          conditions: [],
          source: 'SYSTEM',
          cooldownMinutes: 0
        } as Alert);
      }
    }
  }

  return alerts;
}
