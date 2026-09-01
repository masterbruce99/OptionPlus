import { PortfolioPosition, PortfolioGreeks, ConcentrationReport } from './types';

export function calculatePositionPnL(position: PortfolioPosition): number {
  if (position.entryPrice === undefined || position.contracts === 0) return 0;
  
  let currentMark = 0;
  
  // Follow valuation method
  if (position.valuationMethod === 'USER_DEFINED' && position.userMark !== undefined) {
    currentMark = position.userMark;
  } else if (position.valuationMethod === 'BID' && position.currentBid !== undefined) {
    currentMark = position.currentBid;
  } else if (position.valuationMethod === 'ASK' && position.currentAsk !== undefined) {
    currentMark = position.currentAsk;
  } else if (position.valuationMethod === 'MID' && position.currentBid !== undefined && position.currentAsk !== undefined) {
    currentMark = (position.currentBid + position.currentAsk) / 2;
  } else if (position.valuationMethod === 'LAST' && position.currentLast !== undefined) {
    currentMark = position.currentLast;
  } else {
    // Fallback to mid if available, else 0
    if (position.currentBid !== undefined && position.currentAsk !== undefined) {
      currentMark = (position.currentBid + position.currentAsk) / 2;
    }
  }

  // PnL = (Current - Entry) * Direction * Quantity * Multiplier
  const direction = position.side === 'long' ? 1 : -1;
  return (currentMark - position.entryPrice) * direction * position.contracts * position.multiplier;
}

export function aggregatePortfolioGreeks(positions: PortfolioPosition[]): PortfolioGreeks {
  let netDelta = 0;
  let netGamma = 0;
  let netTheta = 0;
  let netVega = 0;
  let netRho = 0;

  for (const pos of positions) {
    if (!pos.greeks) continue;
    
    const qty = pos.contracts * pos.multiplier;
    const direction = pos.side === 'long' ? 1 : -1;
    const totalMultiplier = qty * direction;

    netDelta += pos.greeks.delta * totalMultiplier;
    netGamma += pos.greeks.gamma * totalMultiplier;
    netTheta += pos.greeks.theta * totalMultiplier;
    netVega += pos.greeks.vega * totalMultiplier;
    netRho += pos.greeks.rho * totalMultiplier;
  }

  // Dollar Greeks (assuming delta is already share equivalent if we used contract multiplier)
  // For standard equity options, Delta of 0.50 * 1 contract * 100 multiplier = 50 share equivalents.
  // Dollar Delta is usually Delta * UnderlyingPrice, but to display "shares equivalent", we just use netDelta.
  // Here, we define:
  // dollarDelta = netDelta (as share equivalents)
  // dollarGamma = netGamma (change in share equivalents per $1 move)
  // dollarTheta = netTheta (daily dollar decay)
  // dollarVega = netVega (dollar change per 1 point IV move)

  return {
    netDelta,
    netGamma,
    netTheta,
    netVega,
    netRho,
    dollarDelta: netDelta,
    dollarGamma: netGamma,
    dollarTheta: netTheta,
    dollarVega: netVega,
  };
}

export function analyzeConcentration(positions: PortfolioPosition[]): ConcentrationReport {
  const report: ConcentrationReport = {
    underlying: {},
    expiration: {},
    strike: {}
  };

  for (const pos of positions) {
    // Underlying
    if (!report.underlying[pos.underlying]) {
      report.underlying[pos.underlying] = { capital: 0, delta: 0, positions: 0 };
    }
    report.underlying[pos.underlying].positions += 1;
    report.underlying[pos.underlying].delta += (pos.greeks?.delta || 0) * pos.contracts * pos.multiplier * (pos.side === 'long' ? 1 : -1);
    
    // Capital (rough estimate using entry price for premium paid/received)
    const cap = pos.entryPrice * pos.contracts * pos.multiplier;
    report.underlying[pos.underlying].capital += cap;

    // Expiration
    if (pos.expiration) {
      if (!report.expiration[pos.expiration]) {
        report.expiration[pos.expiration] = { capital: 0, delta: 0, positions: 0 };
      }
      report.expiration[pos.expiration].positions += 1;
      report.expiration[pos.expiration].delta += (pos.greeks?.delta || 0) * pos.contracts * pos.multiplier * (pos.side === 'long' ? 1 : -1);
      report.expiration[pos.expiration].capital += cap;
    }

    // Strike
    if (pos.strike > 0) {
      const strikeStr = pos.strike.toString();
      if (!report.strike[strikeStr]) {
        report.strike[strikeStr] = { capital: 0, delta: 0, positions: 0 };
      }
      report.strike[strikeStr].positions += 1;
      report.strike[strikeStr].delta += (pos.greeks?.delta || 0) * pos.contracts * pos.multiplier * (pos.side === 'long' ? 1 : -1);
      report.strike[strikeStr].capital += cap;
    }
  }

  return report;
}

export function calculateNotionalExposure(positions: PortfolioPosition[], underlyingPrices: Record<string, number>): number {
  let exposure = 0;
  for (const pos of positions) {
    const uPrice = underlyingPrices[pos.underlying] || 0;
    // Notional for option = strike * multiplier * contracts, or stock price * multiplier * contracts.
    // For standard margin, often the underlying value controls notional.
    // We will use strike * multiplier * contracts for options, and price * multiplier * contracts for stock.
    const referencePrice = pos.type === 'stock' ? uPrice : pos.strike;
    exposure += referencePrice * pos.contracts * pos.multiplier;
  }
  return exposure;
}

export function calculatePremiumExposure(positions: PortfolioPosition[]): number {
  let premium = 0;
  for (const pos of positions) {
    const direction = pos.side === 'long' ? 1 : -1;
    premium += pos.entryPrice * pos.contracts * pos.multiplier * direction;
  }
  return premium;
}
