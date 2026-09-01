import { OptionContract } from './providers/MarketDataProvider';
import { TradeLeg } from './payoffEngine';

export interface RiskWarning {
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

/**
 * Generates deterministic risk warnings based on position and market data.
 */
export function evaluateRisk(legs: TradeLeg[], contracts: Map<string, OptionContract>, daysToExpiration: number): RiskWarning[] {
  const warnings: RiskWarning[] = [];

  if (legs.length === 0) return warnings;

  // 1. Near Expiration Warning
  if (daysToExpiration <= 7) {
    warnings.push({
      level: 'warning',
      title: 'NEAR EXPIRATION',
      message: 'Time remaining is short, so option value can change rapidly. Gamma risk is elevated.'
    });
  }

  legs.forEach(leg => {
    if (leg.type === 'stock') return; // Skip stock legs for option-specific risks

    // Use leg ID to find the contract if passed. Assuming leg.id is the contract symbol for this purpose
    const contract = contracts.get(leg.id);
    if (!contract) return;

    // 2. Wide Bid/Ask Spread Warning
    const spread = contract.ask - contract.bid;
    const midPrice = (contract.ask + contract.bid) / 2;
    if (midPrice > 0 && spread / midPrice > 0.1) {
      warnings.push({
        level: 'warning',
        title: 'WIDE BID/ASK SPREAD',
        message: `The spread for strike ${leg.strike} ${leg.type.toUpperCase()} is wide (>10%). Execution may be more difficult because the quoted market is relatively wide.`
      });
    }

    // 3. High Implied Volatility Warning
    if (contract.impliedVolatility > 1.0) { // > 100% IV
      warnings.push({
        level: 'warning',
        title: 'HIGH IV',
        message: `Strike ${leg.strike} ${leg.type.toUpperCase()} has High Implied Volatility. Option premium is highly sensitive to changes in implied volatility.`
      });
    }

    // 4. Low Liquidity Warning
    if (contract.volume < 10 && contract.openInterest < 50) {
      warnings.push({
        level: 'warning',
        title: 'LOW OPEN INTEREST / LOW VOLUME',
        message: `Liquidity may be limited for strike ${leg.strike} ${leg.type.toUpperCase()}. It may be hard to enter or exit at a fair price.`
      });
    }
  });

  return warnings;
}
