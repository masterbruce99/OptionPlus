/**
 * Phase 4 — Cost Engine
 *
 * Calculates transaction costs for arbitrage strategies.
 *
 * RULE: Unknown cost ≠ zero cost.
 * When costs are UNCONFIGURED, Net Edge = UNDETERMINED.
 */

import { ArbitrageCostEstimate, CostStatus, ArbitrageLeg } from './types';

export interface CostConfig {
  /** Commission per contract leg (open + close = 2× commission) */
  commissionPerContractLeg: number;
  /** Exchange fee per contract */
  exchangeFeePerContract: number;
  /** Regulatory fee per contract */
  regulatoryFeePerContract: number;
  /** Slippage estimate as a fraction of the premium, e.g. 0.02 = 2% */
  slippageFraction: number;
  /** Annual borrowing cost (for short stock, e.g. 0.01 = 1%) */
  annualBorrowRate: number;
  /** Whether borrow cost is known/configured */
  borrowCostKnown: boolean;
}

export const DEFAULT_COST_CONFIG: CostConfig = {
  commissionPerContractLeg: 0.65,
  exchangeFeePerContract: 0.30,
  regulatoryFeePerContract: 0.03,
  slippageFraction: 0.005,
  annualBorrowRate: 0.0,
  borrowCostKnown: false, // User must configure borrow explicitly
};

/**
 * Compute the full cost estimate for an arbitrage strategy.
 *
 * @param legs - All arbitrage legs
 * @param capitalRequirement - Total capital tied up per contract set
 * @param dte - Days to expiration (for financing/borrow annualization)
 * @param config - Cost configuration (defaults to DEFAULT_COST_CONFIG)
 */
export function computeArbitrageCosts(
  legs: ArbitrageLeg[],
  capitalRequirement: number,
  dte: number,
  config: CostConfig = DEFAULT_COST_CONFIG
): ArbitrageCostEstimate {
  const numLegs = legs.length;
  // Each leg is opened and closed, so 2 commissions unless options expire worthless
  // We conservatively assume a closing leg for each
  const commission = numLegs * 2 * config.commissionPerContractLeg;
  const exchangeFees = numLegs * 2 * config.exchangeFeePerContract;
  const regulatoryFees = numLegs * 2 * config.regulatoryFeePerContract;

  // Slippage: estimated on the total premium transacted
  const totalPremium = legs.reduce(
    (sum, leg) => sum + leg.executablePrice * leg.multiplier * leg.quantity,
    0
  );
  const slippage = totalPremium * config.slippageFraction;

  // Financing: opportunity cost on capital tied up for the period
  // Using simple interest: capitalRequirement × riskFreeRate × (dte/365)
  // This is NOT added here — it's added by the caller using the rate provider
  const financing = 0; // Caller computes this using the risk-free rate

  // Borrow cost for short-stock legs
  const hasShortStock = legs.some(
    (l) => l.instrument === 'STOCK' && l.action === 'SELL'
  );
  let borrowCost = 0;
  let status: CostStatus = 'CONFIGURED';
  let netEdgeDetermined = true;

  if (hasShortStock && !config.borrowCostKnown) {
    status = 'UNCONFIGURED';
    netEdgeDetermined = false;
    borrowCost = 0; // Unknown — not assumed zero
  } else if (hasShortStock && config.borrowCostKnown) {
    borrowCost =
      capitalRequirement * config.annualBorrowRate * (dte / 365);
  }

  const totalCost = commission + exchangeFees + regulatoryFees + slippage + financing + borrowCost;

  return {
    commission,
    exchangeFees,
    regulatoryFees,
    slippage,
    financing,
    borrowCost,
    totalCost,
    status,
    netEdgeDetermined,
  };
}

/**
 * Add financing cost to an existing cost estimate.
 * Called after the risk-free rate is known.
 */
export function addFinancingCost(
  costs: ArbitrageCostEstimate,
  capitalRequirement: number,
  riskFreeRate: number,
  dte: number
): ArbitrageCostEstimate {
  const financing = capitalRequirement * riskFreeRate * (dte / 365);
  return {
    ...costs,
    financing,
    totalCost: costs.totalCost + financing,
  };
}
