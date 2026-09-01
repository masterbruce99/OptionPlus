/**
 * Phase 4 — Core Arbitrage Engine
 *
 * Implements: Put-Call Parity, Synthetic Stock, Conversion, Reversal,
 *             Box Spread, Vertical Spread Bounds
 *
 * CRITICAL RULES:
 * 1. BUY → ASK price (never midpoint for executable analysis)
 * 2. SELL → BID price (never midpoint for executable analysis)
 * 3. Midpoint analysis is clearly labeled THEORETICAL MIDPOINT ANALYSIS only
 * 4. Never label something "guaranteed arbitrage"
 * 5. Every candidate includes what could eliminate the edge
 */

import { OptionContract } from '../providers/MarketDataProvider';
import {
  ArbitrageCandidate,
  ArbitrageLeg,
  ArbitrageType,
  ArbitrageClassification,
  ExecutionAssessment,
  ExecutionStatus,
  PricingRelationship,
  DataQuality,
} from './types';
import { DividendData, RateData } from './types';
import { CostConfig, computeArbitrageCosts, addFinancingCost, DEFAULT_COST_CONFIG } from './costEngine';
import { validateArbitrageData } from './dataQuality';

// ============================================================
// HELPERS
// ============================================================

function makeLeg(
  action: 'BUY' | 'SELL',
  instrument: 'CALL' | 'PUT' | 'STOCK',
  bid: number,
  ask: number,
  quantity = 1,
  strike?: number,
  expiration?: string,
  multiplier = 100
): ArbitrageLeg {
  const executablePrice = action === 'BUY' ? ask : bid;
  const midpoint = (bid + ask) / 2;
  return {
    action,
    instrument,
    strike,
    expiration,
    executablePrice,
    midpoint,
    bid,
    ask,
    quantity,
    multiplier,
  };
}

function daysToExpiration(expiration: string): number {
  const exp = new Date(expiration + 'T16:00:00-05:00'); // options expire at market close
  const now = new Date();
  return Math.max(0, (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function generateId(type: ArbitrageType, underlying: string, strike: number, expiration: string): string {
  return `${type}_${underlying}_${strike}_${expiration}_${Date.now()}`;
}

function classifyFromEdge(
  grossEdge: number,
  netEdge: number | null,
  dataQuality: DataQuality,
  executionAssessment: ExecutionAssessment
): ArbitrageClassification {
  if (dataQuality.status === 'INSUFFICIENT') return 'INSUFFICIENT_DATA';
  if (executionAssessment.status === 'INSUFFICIENT_DATA') return 'INSUFFICIENT_DATA';
  if (grossEdge <= 0) return 'NO_DISLOCATION';
  if (!executionAssessment.spreadsAcceptable || !executionAssessment.liquidityAcceptable) {
    return 'EXECUTION_UNCERTAIN';
  }
  if (dataQuality.status === 'PARTIAL' || !executionAssessment.quotesFresh) {
    return 'THEORETICAL_DISLOCATION';
  }
  if (netEdge === null) return 'POTENTIAL_ARBITRAGE';
  if (netEdge > 0) return 'POSITIVE_AFTER_CONFIGURED_COSTS';
  if (grossEdge > 0) return 'THEORETICAL_DISLOCATION';
  return 'NO_DISLOCATION';
}

function assessExecution(legs: ArbitrageLeg[], dataQuality: DataQuality): ExecutionAssessment {
  const reasons: string[] = [];

  if (dataQuality.status === 'INSUFFICIENT') {
    return {
      status: 'INSUFFICIENT_DATA',
      reasons: ['Insufficient market data'],
      spreadsAcceptable: false,
      liquidityAcceptable: false,
      quotesFresh: false,
    };
  }

  // Check spread widths
  const maxSpreadFraction = 0.10; // 10% of midpoint
  const wideSpreads = legs.filter((l) => {
    const mid = (l.bid + l.ask) / 2;
    if (mid <= 0) return false;
    return (l.ask - l.bid) / mid > maxSpreadFraction;
  });
  const spreadsAcceptable = wideSpreads.length === 0;
  if (!spreadsAcceptable) {
    reasons.push(`${wideSpreads.length} leg(s) have wide bid/ask spreads (>10% of midpoint)`);
  }

  // Quote freshness
  const quotesFresh = !dataQuality.issues.some((i) => i.includes('old'));
  if (!quotesFresh) {
    reasons.push('Quotes may be stale');
  }

  // Basic liquidity from bid/ask availability
  const allHaveQuotes = legs.every((l) => l.bid > 0 || l.ask > 0);
  const liquidityAcceptable = allHaveQuotes;
  if (!liquidityAcceptable) reasons.push('Some legs have no market quotes');

  let status: ExecutionStatus = 'EXECUTABLE';
  if (!allHaveQuotes || dataQuality.status === 'STALE') {
    status = 'EXECUTION_UNCERTAIN';
  }
  if (!spreadsAcceptable) {
    status = 'NOT_EXECUTABLE';
  }
  // Note: INSUFFICIENT case is handled by the early return above.

  return {
    status,
    reasons,
    spreadsAcceptable,
    liquidityAcceptable,
    quotesFresh,
  };
}

const STANDARD_EDGE_KILLERS = [
  'Bid/ask spreads can eliminate the apparent edge when filled at executable prices',
  'Commissions and exchange fees reduce net profit',
  'Slippage on multi-leg orders can cause partial fills at worse prices',
  'Stale quotes: by the time you submit, prices may have moved',
  'Assignment risk on short options can disrupt the position',
  'Margin/capital requirements may exceed available funds',
  'Broker may restrict certain multi-leg strategies for your account level',
];

// ============================================================
// MODULE 2: PUT-CALL PARITY
// ============================================================

/**
 * Analyzes put-call parity: C - P = S - K × e^(-r×T) - D
 *
 * Where:
 *   C = Call price
 *   P = Put price
 *   S = Stock price
 *   K = Strike
 *   r = Risk-free rate (annualized)
 *   T = Time to expiration (years)
 *   D = Present value of dividends
 *
 * A violation means the relationship appears imbalanced.
 * Whether this is EXECUTABLE depends on bid/ask and costs.
 */
export function analyzePutCallParity(
  call: OptionContract,
  put: OptionContract,
  underlyingPrice: number,
  rateData: RateData,
  dividendData: DividendData,
  costConfig: CostConfig = DEFAULT_COST_CONFIG
): ArbitrageCandidate {
  if (call.strike !== put.strike || call.expiration !== put.expiration) {
    throw new Error('Put-call parity requires matching strike and expiration');
  }

  const strike = call.strike;
  const expiration = call.expiration;
  const dte = daysToExpiration(expiration);
  const T = dte / 365;
  const r = rateData.status === 'REAL_DATA' ? rateData.rate : 0;

  // PV of strike
  const pvStrike = strike * Math.exp(-r * T);
  // PV of dividends (continuous approximation)
  const pvDividend = underlyingPrice * (1 - Math.exp(-dividendData.continuousYield * T));

  // Theoretical: C - P = S - PV(K) - PV(D)
  const theoreticalCMinusP = underlyingPrice - pvStrike - pvDividend;

  // Market executable:
  // To exploit C overpriced relative to P: Sell Call (Bid), Buy Put (Ask), Buy Stock
  // To exploit P overpriced relative to C: Buy Call (Ask), Sell Put (Bid), Sell Stock

  const callBid = call.bid || 0;
  const callAsk = call.ask || 0;
  const putBid = put.bid || 0;
  const putAsk = put.ask || 0;

  // Calculate actual market C - P using midpoints for THEORETICAL display
  const callMid = (callBid + callAsk) / 2;
  const putMid = (putBid + putAsk) / 2;
  const marketCMinusPMid = callMid - putMid;

  const midpointDislocation = marketCMinusPMid - theoreticalCMinusP;

  // Executable analysis: check which direction is potentially profitable
  // Direction 1: Market C-P > theoretical → sell call / buy put / buy stock
  // Direction 2: Market C-P < theoretical → buy call / sell put / sell stock

  const execCMinusP_dir1 = callBid - putAsk; // sell call at bid, buy put at ask
  const execCMinusP_dir2 = callAsk - putBid; // buy call at ask, sell put at bid

  // Gross executable edge for direction 1 (call appears overpriced vs put)
  const grossEdgeDir1 = execCMinusP_dir1 - theoreticalCMinusP;
  // Gross executable edge for direction 2 (put appears overpriced vs call)
  const grossEdgeDir2 = theoreticalCMinusP - execCMinusP_dir2;

  // Pick the direction with positive gross edge
  const grossEdge = Math.max(0, grossEdgeDir1, grossEdgeDir2);
  const direction = grossEdgeDir1 >= grossEdgeDir2 ? 1 : 2;

  // Build legs for the chosen direction
  let legs: ArbitrageLeg[];
  if (direction === 1) {
    legs = [
      makeLeg('SELL', 'CALL', callBid, callAsk, 1, strike, expiration),
      makeLeg('BUY', 'PUT', putBid, putAsk, 1, strike, expiration),
      makeLeg('BUY', 'STOCK', underlyingPrice, underlyingPrice, 1),
    ];
  } else {
    legs = [
      makeLeg('BUY', 'CALL', callBid, callAsk, 1, strike, expiration),
      makeLeg('SELL', 'PUT', putBid, putAsk, 1, strike, expiration),
      makeLeg('SELL', 'STOCK', underlyingPrice, underlyingPrice, 1),
    ];
  }

  const capitalRequirement = underlyingPrice * 100 + Math.abs(grossEdge) * 100;
  const dataQuality = validateArbitrageData(call, put, underlyingPrice, rateData, dividendData);
  const costs = addFinancingCost(
    computeArbitrageCosts(legs, capitalRequirement, dte, costConfig),
    capitalRequirement,
    r,
    dte
  );
  const actualGrossEdge = grossEdge * 100; // per contract
  const actualTotalCost = costs.totalCost;
  const netEdge = costs.netEdgeDetermined ? actualGrossEdge - actualTotalCost : null;

  const executionAssessment = assessExecution(legs, dataQuality);
  const classification = classifyFromEdge(actualGrossEdge, netEdge, dataQuality, executionAssessment);

  const pricingRelationship: PricingRelationship = {
    theoreticalValue: theoreticalCMinusP,
    marketValue: marketCMinusPMid,
    difference: midpointDislocation,
    dislocationType:
      Math.abs(midpointDislocation) < 0.01
        ? 'FAIR'
        : midpointDislocation > 0
        ? 'OVERPRICED'
        : 'UNDERPRICED',
    significantDislocation: Math.abs(midpointDislocation) > 0.05,
  };

  const assumptions: string[] = [
    `Risk-free rate: ${(r * 100).toFixed(3)}% (${rateData.status === 'REAL_DATA' ? rateData.source : 'UNAVAILABLE — calculation used 0%'})`,
    `Dividend: ${dividendData.status} — annual dividend $${dividendData.annualDividend.toFixed(2)}, yield ${(dividendData.continuousYield * 100).toFixed(2)}%`,
    `Time to expiration: ${dte.toFixed(1)} days`,
    'Contract multiplier: 100',
    'Executable prices: BUY at ASK, SELL at BID',
    'Midpoint analysis labeled THEORETICAL only',
  ];

  if (dividendData.status === 'UNAVAILABLE') {
    assumptions.push('WARNING: Dividend unknown — parity calculation may be inaccurate');
  }
  if (rateData.status === 'UNAVAILABLE') {
    assumptions.push('WARNING: Risk-free rate unavailable — zero rate used, understates PV of strike');
  }

  return {
    id: generateId('PUT_CALL_PARITY', call.underlying, strike, expiration),
    type: 'PUT_CALL_PARITY',
    underlying: call.underlying,
    strike,
    expiration,
    legs,
    pricingRelationship,
    grossEdge: actualGrossEdge,
    theoreticalMidpointEdge: midpointDislocation * 100,
    estimatedCosts: costs,
    netEdge,
    capitalRequirement,
    dataQuality,
    executionAssessment,
    classification,
    assumptions,
    explanation: buildPutCallParityExplanation(
      strike, theoreticalCMinusP, marketCMinusPMid, midpointDislocation, direction
    ),
    edgeKillers: [
      ...STANDARD_EDGE_KILLERS,
      `If dividends are actually paid before expiration, parity shifts (current status: ${dividendData.status})`,
      `If the risk-free rate changes significantly before expiration`,
      `Early exercise of American-style options can disrupt the position`,
    ],
    timestamp: Date.now(),
  };
}

function buildPutCallParityExplanation(
  strike: number, theoretical: number, market: number, dislocation: number, direction: number
): string {
  return [
    `PUT-CALL PARITY ANALYSIS`,
    `Theoretical C - P = $${theoretical.toFixed(4)} (based on current stock, strike, rate, dividends)`,
    `Market midpoint C - P = $${market.toFixed(4)}`,
    `Apparent midpoint dislocation = $${dislocation.toFixed(4)} (THEORETICAL — midpoint only)`,
    direction === 1
      ? `Executable direction: SELL CALL (at bid) / BUY PUT (at ask) / BUY STOCK — call appears relatively overpriced`
      : `Executable direction: BUY CALL (at ask) / SELL PUT (at bid) / SELL STOCK — put appears relatively overpriced`,
    `IMPORTANT: A theoretical dislocation does not guarantee a profitable trade.`,
    `The above gross edge uses executable bid/ask prices. Subtract transaction costs to determine net edge.`,
  ].join('\n');
}

// ============================================================
// MODULE 4: SYNTHETIC STOCK
// ============================================================

/**
 * Synthetic Long Stock = Long Call + Short Put (same strike/expiration)
 * Synthetic cost vs actual stock cost comparison.
 */
export function analyzeSyntheticStock(
  call: OptionContract,
  put: OptionContract,
  underlyingPrice: number,
  rateData: RateData,
  dividendData: DividendData,
  costConfig: CostConfig = DEFAULT_COST_CONFIG
): ArbitrageCandidate {
  const strike = call.strike;
  const expiration = call.expiration;
  const dte = daysToExpiration(expiration);
  const r = rateData.status === 'REAL_DATA' ? rateData.rate : 0;
  const T = dte / 365;

  const callBid = call.bid || 0;
  const callAsk = call.ask || 0;
  const putBid = put.bid || 0;
  const putAsk = put.ask || 0;

  // Synthetic long stock: Buy call at ask, Sell put at bid
  const syntheticCost = callAsk - putBid;
  // Equivalent stock position: Buy stock at current price
  // Adjusted for time value: synthetic replicates stock at expiration
  // Theoretical synthetic cost (at parity) = S - PV(K) - PV(D)
  const pvStrike = strike * Math.exp(-r * T);
  const pvDividend = underlyingPrice * (1 - Math.exp(-dividendData.continuousYield * T));
  const theoreticalSyntheticCost = underlyingPrice - pvStrike - pvDividend;

  // Gross edge: if synthetic cheaper than theoretical → opportunity
  const grossEdgePerShare = theoreticalSyntheticCost - syntheticCost;
  const grossEdge = grossEdgePerShare * 100;

  const legs = [
    makeLeg('BUY', 'CALL', callBid, callAsk, 1, strike, expiration),
    makeLeg('SELL', 'PUT', putBid, putAsk, 1, strike, expiration),
  ];

  const capitalRequirement = Math.abs(syntheticCost) * 100 + strike * 100;
  const dataQuality = validateArbitrageData(call, put, underlyingPrice, rateData, dividendData);
  const costs = addFinancingCost(
    computeArbitrageCosts(legs, capitalRequirement, dte, costConfig),
    capitalRequirement,
    r,
    dte
  );
  const netEdge = costs.netEdgeDetermined ? grossEdge - costs.totalCost : null;
  const executionAssessment = assessExecution(legs, dataQuality);
  const classification = classifyFromEdge(grossEdge, netEdge, dataQuality, executionAssessment);

  const pricingRelationship: PricingRelationship = {
    theoreticalValue: theoreticalSyntheticCost,
    marketValue: syntheticCost,
    difference: grossEdgePerShare,
    dislocationType: grossEdgePerShare > 0.01 ? 'UNDERPRICED' : grossEdgePerShare < -0.01 ? 'OVERPRICED' : 'FAIR',
    significantDislocation: Math.abs(grossEdgePerShare) > 0.05,
  };

  return {
    id: generateId('SYNTHETIC_STOCK', call.underlying, strike, expiration),
    type: 'SYNTHETIC_STOCK',
    underlying: call.underlying,
    strike,
    expiration,
    legs,
    pricingRelationship,
    grossEdge,
    theoreticalMidpointEdge: ((callBid + callAsk) / 2 - (putBid + putAsk) / 2 - theoreticalSyntheticCost) * -100,
    estimatedCosts: costs,
    netEdge,
    capitalRequirement,
    dataQuality,
    executionAssessment,
    classification,
    assumptions: [
      `Synthetic Long Stock: Buy Call (K=${strike}) + Sell Put (K=${strike})`,
      `Actual stock cost: $${underlyingPrice.toFixed(2)}`,
      `Executable synthetic cost: $${syntheticCost.toFixed(4)} (call ask - put bid)`,
      `Theoretical synthetic cost: $${theoreticalSyntheticCost.toFixed(4)}`,
      `Rate: ${(r * 100).toFixed(3)}% (${rateData.status})`,
      `Dividend: ${dividendData.status}`,
    ],
    explanation: `SYNTHETIC STOCK ANALYSIS\nBuying a call and selling a put at the same strike creates synthetic stock exposure.\nExecutable synthetic cost: $${syntheticCost.toFixed(4)} vs theoretical $${theoreticalSyntheticCost.toFixed(4)}.\nGross edge per share: $${grossEdgePerShare.toFixed(4)} (executable bid/ask prices).\nThis analysis does NOT include stock borrowing costs, margin, or dividends if status is UNAVAILABLE.`,
    edgeKillers: [
      ...STANDARD_EDGE_KILLERS,
      'Short put has unlimited downside risk — margin requirements are high',
      `Dividend payments affect synthetic vs actual stock comparison (status: ${dividendData.status})`,
    ],
    timestamp: Date.now(),
  };
}

// ============================================================
// MODULE 5: CONVERSION
// ============================================================

/**
 * Conversion: Long Stock + Long Put + Short Call (same strike/expiration)
 * Creates a risk-free position at expiration if priced correctly.
 * Gross edge = collected credit - cost of put - financing cost of stock
 */
export function analyzeConversion(
  call: OptionContract,
  put: OptionContract,
  underlyingPrice: number,
  rateData: RateData,
  dividendData: DividendData,
  costConfig: CostConfig = DEFAULT_COST_CONFIG
): ArbitrageCandidate {
  const strike = call.strike;
  const expiration = call.expiration;
  const dte = daysToExpiration(expiration);
  const T = dte / 365;
  const r = rateData.status === 'REAL_DATA' ? rateData.rate : 0;

  const callBid = call.bid || 0;
  const callAsk = call.ask || 0;
  const putBid = put.bid || 0;
  const putAsk = put.ask || 0;

  // Conversion legs (executable):
  //   Buy Stock at current price
  //   Buy Put at ASK
  //   Sell Call at BID
  const stockCost = underlyingPrice;
  const putCost = putAsk;
  const callCredit = callBid;

  // At expiration, position is worth exactly strike regardless of stock price
  // Initial cash flow per share = -stockCost - putCost + callCredit
  const initialCashFlow = -stockCost - putCost + callCredit;
  // Expiration cash flow = +strike (guaranteed)
  const expirationCashFlow = strike;
  // Gross edge per share = total P&L ignoring financing/costs
  // = callCredit - putCost - (stockCost - strike) = callCredit - putCost + strike - stockCost
  const grossEdgePerShare = callCredit - putCost + strike - stockCost;
  const grossEdge = grossEdgePerShare * 100;

  // Financing cost: carrying stock position
  const stockCarryingCost = stockCost * r * T;
  // Dividend benefit: receive dividends on long stock
  const dividendBenefit = dividendData.status !== 'UNAVAILABLE'
    ? underlyingPrice * dividendData.continuousYield * T
    : 0;

  const legs = [
    makeLeg('BUY', 'STOCK', underlyingPrice, underlyingPrice, 1),
    makeLeg('BUY', 'PUT', putBid, putAsk, 1, strike, expiration),
    makeLeg('SELL', 'CALL', callBid, callAsk, 1, strike, expiration),
  ];

  const capitalRequirement = (stockCost + putCost) * 100;
  const dataQuality = validateArbitrageData(call, put, underlyingPrice, rateData, dividendData);
  const costs = addFinancingCost(
    computeArbitrageCosts(legs, capitalRequirement, dte, costConfig),
    capitalRequirement,
    r,
    dte
  );
  const netEdge = costs.netEdgeDetermined ? grossEdge - costs.totalCost : null;
  const executionAssessment = assessExecution(legs, dataQuality);
  const classification = classifyFromEdge(grossEdge, netEdge, dataQuality, executionAssessment);

  const pricingRelationship: PricingRelationship = {
    theoreticalValue: 0, // should be zero in a frictionless market
    marketValue: grossEdgePerShare,
    difference: grossEdgePerShare,
    dislocationType: grossEdgePerShare > 0.01 ? 'OVERPRICED' : grossEdgePerShare < -0.01 ? 'UNDERPRICED' : 'FAIR',
    significantDislocation: Math.abs(grossEdgePerShare) > 0.05,
  };

  return {
    id: generateId('CONVERSION', call.underlying, strike, expiration),
    type: 'CONVERSION',
    underlying: call.underlying,
    strike,
    expiration,
    legs,
    pricingRelationship,
    grossEdge,
    theoreticalMidpointEdge: (((callBid + callAsk) / 2) - ((putBid + putAsk) / 2) + strike - stockCost) * 100,
    estimatedCosts: costs,
    netEdge,
    capitalRequirement,
    dataQuality,
    executionAssessment,
    classification,
    assumptions: [
      `Legs: Buy Stock @ $${stockCost.toFixed(2)}, Buy Put @ $${putCost.toFixed(2)} (ask), Sell Call @ $${callCredit.toFixed(2)} (bid)`,
      `Initial cash flow per share: $${initialCashFlow.toFixed(4)}`,
      `Expiration payoff: $${expirationCashFlow.toFixed(2)} (guaranteed by position structure)`,
      `Gross edge per share (executable): $${grossEdgePerShare.toFixed(4)}`,
      `Financing cost to carry stock: $${stockCarryingCost.toFixed(4)} per share (${(r * 100).toFixed(3)}% × ${T.toFixed(3)} years)`,
      `Dividend benefit: ${dividendData.status === 'UNAVAILABLE' ? 'UNKNOWN' : '$' + dividendBenefit.toFixed(4) + ' per share'}`,
    ],
    explanation: `CONVERSION ANALYSIS\nBuy stock, buy put, sell call (same strike/expiration).\nThis locks in a fixed payoff at expiration equal to the strike price.\nExecutable gross edge per share: $${grossEdgePerShare.toFixed(4)}\nThis is NOT risk-free profit — transaction costs, financing, and assignment risk must be subtracted.`,
    edgeKillers: [
      ...STANDARD_EDGE_KILLERS,
      `Financing cost to carry stock reduces profit: ~$${(stockCarryingCost * 100).toFixed(2)} per contract`,
      `Dividends: if ${dividendData.status === 'UNAVAILABLE' ? 'the stock pays dividends (unknown), this affects the calculation' : `annual dividend of $${dividendData.annualDividend.toFixed(2)} affects the edge`}`,
      'Early assignment on short call can disrupt the position',
    ],
    timestamp: Date.now(),
  };
}

// ============================================================
// MODULE 6: REVERSAL
// ============================================================

/**
 * Reversal: Short Stock + Long Call + Short Put (same strike/expiration)
 * Economically opposite of Conversion.
 */
export function analyzeReversal(
  call: OptionContract,
  put: OptionContract,
  underlyingPrice: number,
  rateData: RateData,
  dividendData: DividendData,
  costConfig: CostConfig = DEFAULT_COST_CONFIG
): ArbitrageCandidate {
  const strike = call.strike;
  const expiration = call.expiration;
  const dte = daysToExpiration(expiration);
  const r = rateData.status === 'REAL_DATA' ? rateData.rate : 0;

  const callBid = call.bid || 0;
  const callAsk = call.ask || 0;
  const putBid = put.bid || 0;
  const putAsk = put.ask || 0;

  // Reversal legs:
  //   Sell Stock at current price (requires borrowing — borrow cost matters!)
  //   Buy Call at ASK
  //   Sell Put at BID
  const stockCredit = underlyingPrice;
  const callCost = callAsk;
  const putCredit = putBid;

  // Gross edge per share
  // = stockCredit + putCredit - callCost - strike
  const grossEdgePerShare = stockCredit + putCredit - callCost - strike;
  const grossEdge = grossEdgePerShare * 100;

  const legs = [
    makeLeg('SELL', 'STOCK', underlyingPrice, underlyingPrice, 1),
    makeLeg('BUY', 'CALL', callBid, callAsk, 1, strike, expiration),
    makeLeg('SELL', 'PUT', putBid, putAsk, 1, strike, expiration),
  ];

  const capitalRequirement = strike * 100; // need to cover short stock
  const dataQuality = validateArbitrageData(call, put, underlyingPrice, rateData, dividendData);
  // Reversal always requires short stock → borrow cost is critical
  const costs = addFinancingCost(
    computeArbitrageCosts(legs, capitalRequirement, dte, costConfig),
    capitalRequirement,
    r,
    dte
  );
  const netEdge = costs.netEdgeDetermined ? grossEdge - costs.totalCost : null;
  const executionAssessment = assessExecution(legs, dataQuality);
  const classification = classifyFromEdge(grossEdge, netEdge, dataQuality, executionAssessment);

  const dividendRisk = dividendData.status === 'UNAVAILABLE'
    ? 'CRITICAL: Dividend unknown. Short stock must pay dividends — this directly reduces profit.'
    : `Short stock must pay dividends: ~$${(dividendData.annualDividend * dte / 365).toFixed(4)} per share during hold`;

  return {
    id: generateId('REVERSAL', call.underlying, strike, expiration),
    type: 'REVERSAL',
    underlying: call.underlying,
    strike,
    expiration,
    legs,
    pricingRelationship: {
      theoreticalValue: 0,
      marketValue: grossEdgePerShare,
      difference: grossEdgePerShare,
      dislocationType: grossEdgePerShare > 0.01 ? 'OVERPRICED' : grossEdgePerShare < -0.01 ? 'UNDERPRICED' : 'FAIR',
      significantDislocation: Math.abs(grossEdgePerShare) > 0.05,
    },
    grossEdge,
    theoreticalMidpointEdge: (stockCredit + (putBid + putAsk) / 2 - (callBid + callAsk) / 2 - strike) * 100,
    estimatedCosts: costs,
    netEdge,
    capitalRequirement,
    dataQuality,
    executionAssessment,
    classification,
    assumptions: [
      `Legs: Sell Stock @ $${stockCredit.toFixed(2)}, Buy Call @ $${callCost.toFixed(2)} (ask), Sell Put @ $${putCredit.toFixed(2)} (bid)`,
      `Gross edge per share (executable): $${grossEdgePerShare.toFixed(4)}`,
      `Borrow cost status: ${costConfig.borrowCostKnown ? (costConfig.annualBorrowRate * 100).toFixed(2) + '% annually' : 'UNCONFIGURED — net edge is UNDETERMINED'}`,
      dividendRisk,
    ],
    explanation: `REVERSAL ANALYSIS\nSell stock (short), buy call, sell put — the economic opposite of a conversion.\nExecutable gross edge per share: $${grossEdgePerShare.toFixed(4)}\nWARNING: Short stock requires borrowing shares. Borrow cost is ${costConfig.borrowCostKnown ? 'configured' : 'NOT CONFIGURED — net edge cannot be determined'}. Dividends on short stock reduce profit.`,
    edgeKillers: [
      ...STANDARD_EDGE_KILLERS,
      `Stock borrow cost is ${costConfig.borrowCostKnown ? 'configured' : 'UNKNOWN — this can easily eliminate the entire edge'}`,
      dividendRisk,
      'Short stock has theoretically unlimited upside risk',
      'Early assignment on short put can force covering the short stock position',
    ],
    timestamp: Date.now(),
  };
}

// ============================================================
// MODULE 7: BOX SPREAD
// ============================================================

/**
 * Box Spread: Bull Call Spread + Bear Put Spread (same strikes and expiration)
 * = [Long Call(K1) + Short Call(K2)] + [Long Put(K2) + Short Put(K1)]
 *
 * The box always pays off exactly K2 - K1 at expiration.
 * The implied financing rate = the rate you are borrowing/lending at.
 * This is NOT risk-free profit — it is a financing transaction.
 */
export function analyzeBoxSpread(
  callLow: OptionContract,  // Call at lower strike K1
  callHigh: OptionContract, // Call at higher strike K2
  putLow: OptionContract,   // Put at lower strike K1
  putHigh: OptionContract,  // Put at higher strike K2
  underlyingPrice: number,
  rateData: RateData,
  dividendData: DividendData,
  costConfig: CostConfig = DEFAULT_COST_CONFIG
): ArbitrageCandidate {
  const k1 = callLow.strike;
  const k2 = callHigh.strike;
  const expiration = callLow.expiration;
  const dte = daysToExpiration(expiration);
  const T = dte / 365;
  const r = rateData.status === 'REAL_DATA' ? rateData.rate : 0;

  if (k1 >= k2) throw new Error('Box spread requires K1 < K2');

  const callLowBid = callLow.bid || 0;
  const callLowAsk = callLow.ask || 0;
  const callHighBid = callHigh.bid || 0;
  const callHighAsk = callHigh.ask || 0;
  const putLowBid = putLow.bid || 0;
  const putLowAsk = putLow.ask || 0;
  const putHighBid = putHigh.bid || 0;
  const putHighAsk = putHigh.ask || 0;

  // Long box: pay debit now, receive K2-K1 at expiration
  // Legs: Buy call K1 (ask) + Sell call K2 (bid) + Buy put K2 (ask) + Sell put K1 (bid)
  const boxDebitExecutable =
    callLowAsk - callHighBid + putHighAsk - putLowBid;
  const strikeWidth = k2 - k1;

  // Box is worth exactly strikeWidth at expiration
  // Gross edge (buying the box): you pay boxDebitExecutable, receive strikeWidth
  const grossEdgePerUnit = strikeWidth - boxDebitExecutable;
  const grossEdge = grossEdgePerUnit * 100;

  // Midpoint for THEORETICAL display
  const boxDebitMid =
    (callLowBid + callLowAsk) / 2 -
    (callHighBid + callHighAsk) / 2 +
    (putHighBid + putHighAsk) / 2 -
    (putLowBid + putLowAsk) / 2;
  const theoreticalEdgeMid = (strikeWidth - boxDebitMid) * 100;

  // Implied financing rate from the box price
  // boxDebit = strikeWidth × e^(-r_implied × T)
  // r_implied = -ln(boxDebitExecutable / strikeWidth) / T
  let impliedRate: number | undefined;
  if (boxDebitExecutable > 0 && T > 0 && strikeWidth > 0) {
    impliedRate = -Math.log(boxDebitExecutable / strikeWidth) / T;
  }

  const legs = [
    makeLeg('BUY', 'CALL', callLowBid, callLowAsk, 1, k1, expiration),
    makeLeg('SELL', 'CALL', callHighBid, callHighAsk, 1, k2, expiration),
    makeLeg('BUY', 'PUT', putHighBid, putHighAsk, 1, k2, expiration),
    makeLeg('SELL', 'PUT', putLowBid, putLowAsk, 1, k1, expiration),
  ];

  const capitalRequirement = boxDebitExecutable * 100;
  const dataQuality = validateArbitrageData(callLow, putLow, underlyingPrice, rateData, dividendData);
  const costs = computeArbitrageCosts(legs, capitalRequirement, dte, costConfig);
  // No additional financing cost on box (the debit IS the financing)
  const netEdge = costs.netEdgeDetermined ? grossEdge - costs.totalCost : null;
  const executionAssessment = assessExecution(legs, dataQuality);
  const classification = classifyFromEdge(grossEdge, netEdge, dataQuality, executionAssessment);

  const benchmarkRate = r;
  const rateComparison = impliedRate !== undefined && rateData.status === 'REAL_DATA'
    ? `Implied rate ${(impliedRate * 100).toFixed(3)}% vs benchmark ${(benchmarkRate * 100).toFixed(3)}%`
    : 'Rate comparison unavailable';

  return {
    id: generateId('BOX_SPREAD', callLow.underlying, k1, expiration),
    type: 'BOX_SPREAD',
    underlying: callLow.underlying,
    strike: k1,
    strikeHigh: k2,
    expiration,
    legs,
    pricingRelationship: {
      theoreticalValue: strikeWidth * Math.exp(-r * T), // PV of box payoff
      marketValue: boxDebitExecutable,
      difference: grossEdgePerUnit,
      dislocationType: grossEdgePerUnit > 0.01 ? 'UNDERPRICED' : grossEdgePerUnit < -0.01 ? 'OVERPRICED' : 'FAIR',
      significantDislocation: Math.abs(grossEdgePerUnit) > 0.05,
    },
    grossEdge,
    theoreticalMidpointEdge: theoreticalEdgeMid,
    estimatedCosts: costs,
    netEdge,
    capitalRequirement,
    dataQuality,
    executionAssessment,
    classification,
    impliedFinancingRate: impliedRate,
    benchmarkRate,
    assumptions: [
      `Box spread K1=$${k1}, K2=$${k2}, strike width=$${strikeWidth}`,
      `Executable debit: $${boxDebitExecutable.toFixed(4)} per share ($${(boxDebitExecutable * 100).toFixed(2)} per contract)`,
      `Fixed payoff at expiration: $${strikeWidth} per share ($${(strikeWidth * 100).toFixed(2)} per contract)`,
      `Executable gross edge: $${grossEdgePerUnit.toFixed(4)} per share`,
      impliedRate !== undefined ? `Implied financing rate: ${(impliedRate * 100).toFixed(3)}%` : 'Implied rate: cannot compute',
      rateComparison,
      'A box spread is fundamentally a financing transaction, not a risk-free trade',
    ],
    explanation: `BOX SPREAD ANALYSIS\nA box spread pays exactly K2-K1=$${strikeWidth} at expiration regardless of stock price.\nYou pay $${boxDebitExecutable.toFixed(4)} per share to receive $${strikeWidth} — a ${grossEdgePerUnit >= 0 ? 'profit' : 'loss'} of $${Math.abs(grossEdgePerUnit).toFixed(4)}.\n${impliedRate !== undefined ? `The implied financing rate is ${(impliedRate * 100).toFixed(3)}%.` : ''}\nIMPORTANT: A box spread is a lending/borrowing transaction. The apparent "profit" represents a below-market financing rate, not a guaranteed trade profit — transaction costs and assignment risk apply.`,
    edgeKillers: [
      ...STANDARD_EDGE_KILLERS,
      'Early assignment on short legs can disrupt the fixed payoff structure',
      'Four-leg multi-exchange execution is difficult to fill simultaneously',
      `Transaction costs on 4 legs (8 commissions open+close) can easily eliminate the edge`,
      `${rateComparison}`,
    ],
    timestamp: Date.now(),
  };
}

// ============================================================
// MODULE 8: VERTICAL SPREAD BOUNDS
// ============================================================

/**
 * Checks for vertical spread no-arbitrage violations.
 *
 * Call spread value cannot exceed (K_high - K_low).
 * Put spread value cannot exceed (K_high - K_low).
 *
 * We check both THEORETICAL (midpoint) and EXECUTABLE (bid/ask) violations.
 */
export function analyzeVerticalBounds(
  longContract: OptionContract,
  shortContract: OptionContract,
  underlyingPrice: number
): ArbitrageCandidate {
  const type = longContract.type; // call or put
  const kLong = longContract.strike;
  const kShort = shortContract.strike;
  const expiration = longContract.expiration;

  const longBid = longContract.bid || 0;
  const longAsk = longContract.ask || 0;
  const shortBid = shortContract.bid || 0;
  const shortAsk = shortContract.ask || 0;

  // For call debit spread: K_long < K_short
  // For put debit spread: K_long > K_short
  const strikeWidth = Math.abs(kShort - kLong);

  // Midpoint values (THEORETICAL)
  const longMid = (longBid + longAsk) / 2;
  const shortMid = (shortBid + shortAsk) / 2;
  const spreadMidpointValue = longMid - shortMid;

  // Executable values
  // To arbitrage a spread priced above its maximum payoff, we must SELL the spread.
  // Selling the spread = Sell long contract (at bid), Buy short contract (at ask)
  const spreadExecutableCredit = longBid - shortAsk;

  // Violation: if spread value > strike width, there's a no-arbitrage violation
  const midpointViolation = spreadMidpointValue > strikeWidth;
  const executableViolation = spreadExecutableCredit > strikeWidth;

  // Gross edge from executable violation
  const grossEdgePerShare = executableViolation ? spreadExecutableCredit - strikeWidth : 0;
  const grossEdge = grossEdgePerShare * 100;

  const legs = [
    makeLeg('SELL', type === 'call' ? 'CALL' : 'PUT', longBid, longAsk, 1, kLong, expiration),
    makeLeg('BUY', type === 'call' ? 'CALL' : 'PUT', shortBid, shortAsk, 1, kShort, expiration),
  ];

  const isInsufficientData = longBid <= 0 || shortAsk <= 0;
  const dataQuality: DataQuality = {
    status: isInsufficientData ? 'INSUFFICIENT' : grossEdge > 0 ? 'VALID' : 'VALID',
    issues: isInsufficientData ? ['One or more contracts have no quote'] : [],
    underlyingValid: underlyingPrice > 0,
    callQuoteValid: longBid > 0,
    putQuoteValid: shortAsk > 0,
    contractParamsValid: longContract.expiration === shortContract.expiration,
    interestRateValid: true,
    dividendValid: true,
  };

  const executionAssessment = assessExecution(legs, dataQuality);
  const classification = classifyFromEdge(grossEdge, null, dataQuality, executionAssessment);

  return {
    id: generateId('VERTICAL_BOUND', longContract.underlying, Math.min(kLong, kShort), expiration),
    type: 'VERTICAL_BOUND',
    underlying: longContract.underlying,
    strike: Math.min(kLong, kShort),
    strikeHigh: Math.max(kLong, kShort),
    expiration,
    legs,
    pricingRelationship: {
      theoreticalValue: strikeWidth,
      marketValue: spreadMidpointValue,
      difference: spreadMidpointValue - strikeWidth,
      dislocationType: midpointViolation ? 'OVERPRICED' : 'FAIR',
      significantDislocation: midpointViolation || executableViolation,
    },
    grossEdge,
    theoreticalMidpointEdge: midpointViolation ? (spreadMidpointValue - strikeWidth) * 100 : 0,
    estimatedCosts: {
      commission: 0,
      exchangeFees: 0,
      regulatoryFees: 0,
      slippage: 0,
      financing: 0,
      borrowCost: 0,
      totalCost: 0,
      status: 'UNCONFIGURED',
      netEdgeDetermined: false,
    },
    netEdge: null,
    capitalRequirement: strikeWidth * 100,
    dataQuality,
    executionAssessment,
    classification,
    assumptions: [
      `${type.toUpperCase()} vertical spread: K1=$${Math.min(kLong, kShort)}, K2=$${Math.max(kLong, kShort)}`,
      `Strike width: $${strikeWidth}`,
      `Midpoint spread value: $${spreadMidpointValue.toFixed(4)} — THEORETICAL ONLY`,
      `Executable credit (sell long at bid, buy short at ask): $${spreadExecutableCredit.toFixed(4)}`,
      midpointViolation
        ? `THEORETICAL VIOLATION: Midpoint value $${spreadMidpointValue.toFixed(4)} > strike width $${strikeWidth}`
        : 'No theoretical violation at midpoint',
      executableViolation
        ? `EXECUTABLE VIOLATION: Spread credit $${spreadExecutableCredit.toFixed(4)} > strike width $${strikeWidth}`
        : 'No executable violation at bid/ask',
    ],
    explanation: `VERTICAL SPREAD BOUNDS CHECK\nA ${type} spread cannot be worth more than its strike width ($${strikeWidth}) at expiration.\nMidpoint spread value: $${spreadMidpointValue.toFixed(4)} (THEORETICAL)\nExecutable credit to sell spread: $${spreadExecutableCredit.toFixed(4)}\n${midpointViolation ? 'THEORETICAL VIOLATION DETECTED at midpoint.' : 'No theoretical violation.'}\n${executableViolation ? 'EXECUTABLE VIOLATION DETECTED — the credit received from selling the spread exceeds the maximum potential loss (strike width).' : 'No executable violation — midpoint appearance may be a data artifact.'}`,
    edgeKillers: [
      'The apparent violation may result from stale or crossed quotes',
      'Bid/ask spreads often eliminate midpoint-visible violations',
      'Market maker cross-quotes can create temporary apparent violations',
    ],
    timestamp: Date.now(),
  };
}

// ============================================================
// LIQUIDITY CHECK
// ============================================================

/**
 * Reuses Phase 5 liquidity concepts.
 * Returns a 0-100 score for a pair of contracts.
 */
export function assessArbitrageLiquidity(
  call: OptionContract,
  put: OptionContract
): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  if ((call.volume !== null && call.volume < 10) || (put.volume !== null && put.volume < 10)) {
    score -= 30;
    issues.push('Low volume on call or put (< 10)');
  }
  if ((call.openInterest !== null && call.openInterest < 100) || (put.openInterest !== null && put.openInterest < 100)) {
    score -= 20;
    issues.push('Low open interest (< 100)');
  }

  const callSpread = (call.ask || 0) - (call.bid || 0);
  const putSpread = (put.ask || 0) - (put.bid || 0);
  const callMid = ((call.bid || 0) + (call.ask || 0)) / 2;
  const putMid = ((put.bid || 0) + (put.ask || 0)) / 2;

  if (callMid > 0 && callSpread / callMid > 0.10) {
    score -= 25;
    issues.push(`Call spread/mid ratio ${(callSpread / callMid * 100).toFixed(1)}% > 10%`);
  }
  if (putMid > 0 && putSpread / putMid > 0.10) {
    score -= 25;
    issues.push(`Put spread/mid ratio ${(putSpread / putMid * 100).toFixed(1)}% > 10%`);
  }

  return { score: Math.max(0, score), issues };
}

// ============================================================
// FULL SCAN
// ============================================================

export interface ScanInput {
  call: OptionContract;
  put: OptionContract;
  underlyingPrice: number;
  rateData: RateData;
  dividendData: DividendData;
  costConfig?: CostConfig;
}

/**
 * Run all applicable arbitrage analyses for a matched call/put pair.
 * Returns all candidates (including NO_DISLOCATION results) for transparency.
 */
export function scanArbitragePair(input: ScanInput): ArbitrageCandidate[] {
  const { call, put, underlyingPrice, rateData, dividendData, costConfig } = input;
  const cfg = costConfig ?? DEFAULT_COST_CONFIG;
  const results: ArbitrageCandidate[] = [];

  try {
    results.push(analyzePutCallParity(call, put, underlyingPrice, rateData, dividendData, cfg));
  } catch {
    // Skip if contracts don't match
  }

  try {
    results.push(analyzeSyntheticStock(call, put, underlyingPrice, rateData, dividendData, cfg));
  } catch {
    // Skip
  }

  try {
    results.push(analyzeConversion(call, put, underlyingPrice, rateData, dividendData, cfg));
  } catch {
    // Skip
  }

  try {
    results.push(analyzeReversal(call, put, underlyingPrice, rateData, dividendData, cfg));
  } catch {
    // Skip
  }

  return results;
}
