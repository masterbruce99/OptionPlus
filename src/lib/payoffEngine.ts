export type LegType = 'call' | 'put' | 'stock';
export type LegSide = 'long' | 'short';

export interface TradeLeg {
  id: string;
  type: LegType;
  side: LegSide;
  strike: number; // 0 for stock
  quantity: number;
  entryPrice: number; // per unit (premium for options, stock price for stock)
  multiplier: number; // usually 100 for options, 1 for stock
}

export interface PayoffPoint {
  underlyingPrice: number;
  profit: number;
}

export interface StrategyAnalysis {
  name: string;
  maxProfit: number | null; // null means infinite
  maxLoss: number | null; // null means theoretically infinite
  breakEvens: number[];
  capitalRequired: number;
  netDebitCredit: number; // positive = credit, negative = debit
  payoffData: PayoffPoint[];
}

/**
 * Calculates the net debit/credit of entering the position.
 * Returns negative for debit (paying money), positive for credit (receiving money).
 */
export function calculateNetEntry(legs: TradeLeg[]): number {
  return legs.reduce((total, leg) => {
    const cost = leg.entryPrice * leg.quantity * leg.multiplier;
    return total + (leg.side === 'long' ? -cost : cost);
  }, 0);
}

/**
 * Calculates the payoff of a single leg at expiration for a given underlying price.
 */
export function calculateLegPayoffAtExpiry(leg: TradeLeg, underlyingAtExpiry: number): number {
  let valueAtExpiry = 0;
  
  if (leg.type === 'call') {
    valueAtExpiry = Math.max(0, underlyingAtExpiry - leg.strike);
  } else if (leg.type === 'put') {
    valueAtExpiry = Math.max(0, leg.strike - underlyingAtExpiry);
  } else if (leg.type === 'stock') {
    valueAtExpiry = underlyingAtExpiry;
  }

  const grossValue = valueAtExpiry * leg.quantity * leg.multiplier;
  const entryCost = leg.entryPrice * leg.quantity * leg.multiplier;

  if (leg.side === 'long') {
    if (leg.type === 'stock') {
      return grossValue - entryCost; // stock profit/loss
    }
    return grossValue - entryCost;
  } else {
    if (leg.type === 'stock') {
      return entryCost - grossValue; // short stock profit/loss
    }
    return entryCost - grossValue;
  }
}

/**
 * Calculates the total payoff of all legs at expiration for a given underlying price.
 */
export function calculateTotalPayoffAtExpiry(legs: TradeLeg[], underlyingAtExpiry: number): number {
  return legs.reduce((total, leg) => total + calculateLegPayoffAtExpiry(leg, underlyingAtExpiry), 0);
}

/**
 * Generates an array of PayoffPoints for graphing.
 */
export function generatePayoffData(legs: TradeLeg[], currentUnderlying: number, rangePercent = 0.3, steps = 100): PayoffPoint[] {
  const minPrice = Math.max(0, currentUnderlying * (1 - rangePercent));
  const maxPrice = currentUnderlying * (1 + rangePercent);
  const stepSize = (maxPrice - minPrice) / steps;
  
  const data: PayoffPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const price = minPrice + (i * stepSize);
    data.push({
      underlyingPrice: price,
      profit: calculateTotalPayoffAtExpiry(legs, price)
    });
  }
  return data;
}

// ---------------------------------------------------------------------------
// Specific Strategy Analyzers
// ---------------------------------------------------------------------------

export function analyzeLongCall(leg: TradeLeg): StrategyAnalysis {
  if (leg.type !== 'call' || leg.side !== 'long') throw new Error("Invalid legs for Long Call");
  
  const debit = leg.entryPrice * leg.quantity * leg.multiplier;
  
  return {
    name: "Long Call",
    maxProfit: null, // Infinite
    maxLoss: -debit, // Premium paid
    breakEvens: [leg.strike + leg.entryPrice],
    capitalRequired: debit,
    netDebitCredit: -debit,
    payoffData: []
  };
}

export function analyzeLongPut(leg: TradeLeg): StrategyAnalysis {
  if (leg.type !== 'put' || leg.side !== 'long') throw new Error("Invalid legs for Long Put");
  
  const debit = leg.entryPrice * leg.quantity * leg.multiplier;
  // Technically max profit is limited by stock going to 0
  const maxProfit = (leg.strike - leg.entryPrice) * leg.quantity * leg.multiplier;
  
  return {
    name: "Long Put",
    maxProfit: maxProfit,
    maxLoss: -debit,
    breakEvens: [leg.strike - leg.entryPrice],
    capitalRequired: debit,
    netDebitCredit: -debit,
    payoffData: []
  };
}

export function analyzeCoveredCall(stockLeg: TradeLeg, shortCallLeg: TradeLeg): StrategyAnalysis {
  if (stockLeg.type !== 'stock' || stockLeg.side !== 'long') throw new Error("Invalid stock leg");
  if (shortCallLeg.type !== 'call' || shortCallLeg.side !== 'short') throw new Error("Invalid option leg");
  
  // Assume quantities match 100 shares per 1 option contract
  const shares = stockLeg.quantity * stockLeg.multiplier;
  const options = shortCallLeg.quantity * shortCallLeg.multiplier;
  if (shares !== options) throw new Error("Mismatched quantities for Covered Call");

  const stockCost = stockLeg.entryPrice * shares;
  const premiumReceived = shortCallLeg.entryPrice * options;
  const capitalReq = stockCost; // Assuming fully cash funded stock purchase
  
  // Max profit happens when called away at strike
  // Profit = (Strike - Stock Entry) * shares + Premium
  const maxProfit = ((shortCallLeg.strike - stockLeg.entryPrice) * shares) + premiumReceived;
  
  // Max loss happens if stock goes to 0
  // Loss = -Stock Cost + Premium
  const maxLoss = -stockCost + premiumReceived;

  return {
    name: "Covered Call",
    maxProfit: maxProfit,
    maxLoss: maxLoss,
    breakEvens: [stockLeg.entryPrice - (premiumReceived / shares)],
    capitalRequired: capitalReq,
    netDebitCredit: premiumReceived - stockCost,
    payoffData: []
  };
}

export function analyzeCashSecuredPut(leg: TradeLeg): StrategyAnalysis {
  if (leg.type !== 'put' || leg.side !== 'short') throw new Error("Invalid legs for Cash-Secured Put");
  
  const credit = leg.entryPrice * leg.quantity * leg.multiplier;
  const capitalReq = leg.strike * leg.quantity * leg.multiplier; // Capital required to buy the stock if assigned
  
  const maxLoss = -capitalReq + credit; // Stock goes to 0

  return {
    name: "Cash-Secured Put",
    maxProfit: credit,
    maxLoss: maxLoss,
    breakEvens: [leg.strike - leg.entryPrice],
    capitalRequired: capitalReq,
    netDebitCredit: credit,
    payoffData: []
  };
}

export function analyzeVerticalSpread(longLeg: TradeLeg, shortLeg: TradeLeg): StrategyAnalysis {
  if (longLeg.type !== shortLeg.type) throw new Error("Legs must be of same type");
  if (longLeg.side !== 'long' || shortLeg.side !== 'short') throw new Error("Must have one long and one short leg");
  if (longLeg.quantity !== shortLeg.quantity || longLeg.multiplier !== shortLeg.multiplier) throw new Error("Quantities must match");

  const type = longLeg.type;
  const qty = longLeg.quantity * longLeg.multiplier;
  const longStrike = longLeg.strike;
  const shortStrike = shortLeg.strike;
  
  const longCost = longLeg.entryPrice * qty;
  const shortCredit = shortLeg.entryPrice * qty;
  const netEntry = shortCredit - longCost; // positive = credit, negative = debit
  
  const strikeDiff = Math.abs(longStrike - shortStrike) * qty;

  let name = "";
  let maxProfit = 0;
  let maxLoss = 0;
  let breakEven = 0;
  let capitalReq = 0;

  if (type === 'call') {
    if (longStrike < shortStrike) {
      name = "Bull Call Spread";
      // Debit spread
      maxLoss = netEntry; // netEntry is negative
      maxProfit = strikeDiff + netEntry; 
      breakEven = longStrike + Math.abs(netEntry / qty);
      capitalReq = Math.abs(netEntry);
    } else {
      name = "Bear Call Spread";
      // Credit spread
      maxProfit = netEntry;
      maxLoss = netEntry - strikeDiff; // netEntry positive, loss is negative
      breakEven = shortStrike + Math.abs(netEntry / qty);
      capitalReq = strikeDiff; // Margin requirement is the width of the spread
    }
  } else if (type === 'put') {
    if (longStrike > shortStrike) {
      name = "Bear Put Spread";
      // Debit spread
      maxLoss = netEntry; // negative
      maxProfit = strikeDiff + netEntry;
      breakEven = longStrike - Math.abs(netEntry / qty);
      capitalReq = Math.abs(netEntry);
    } else {
      name = "Bull Put Spread";
      // Credit spread
      maxProfit = netEntry;
      maxLoss = netEntry - strikeDiff;
      breakEven = shortStrike - Math.abs(netEntry / qty);
      capitalReq = strikeDiff; // Margin req
    }
  }

  return {
    name,
    maxProfit,
    maxLoss,
    breakEvens: [breakEven],
    capitalRequired: capitalReq,
    netDebitCredit: netEntry,
    payoffData: []
  };
}

/**
 * Main entry point to analyze an arbitrary set of legs if it matches a known strategy.
 */
export function analyzeStrategy(legs: TradeLeg[], currentUnderlying: number): StrategyAnalysis | null {
  if (!legs || legs.length === 0) return null;

  let analysis: StrategyAnalysis;

  if (legs.length === 1) {
    const leg = legs[0];
    if (leg.type === 'call' && leg.side === 'long') analysis = analyzeLongCall(leg);
    else if (leg.type === 'put' && leg.side === 'long') analysis = analyzeLongPut(leg);
    else if (leg.type === 'put' && leg.side === 'short') analysis = analyzeCashSecuredPut(leg);
    else return null;
  } else if (legs.length === 2) {
    const hasStock = legs.find(l => l.type === 'stock');
    if (hasStock) {
      const stockLeg = legs.find(l => l.type === 'stock' && l.side === 'long');
      const callLeg = legs.find(l => l.type === 'call' && l.side === 'short');
      if (stockLeg && callLeg) analysis = analyzeCoveredCall(stockLeg, callLeg);
      else return null;
    } else {
      const longLeg = legs.find(l => l.side === 'long');
      const shortLeg = legs.find(l => l.side === 'short');
      if (longLeg && shortLeg && longLeg.type === shortLeg.type) {
        analysis = analyzeVerticalSpread(longLeg, shortLeg);
      } else {
        return null;
      }
    }
  } else {
    return null; // Not supporting 3+ legs yet
  }

  // Generate graph data
  analysis.payoffData = generatePayoffData(legs, currentUnderlying);
  
  return analysis;
}
