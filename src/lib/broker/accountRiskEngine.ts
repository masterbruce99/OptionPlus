// Phase 20: Account-Aware Risk Integration
// Incorporates actual broker account data into existing risk/planning calculations.
// When broker data is unavailable, surfaces INSUFFICIENT BROKER DATA — never assumes.

import { BrokerAccount } from './types';
import { isBrokerValueAvailable, formatBrokerMoney } from './accountParser';
import { PortfolioGreeks } from '../portfolio/types';

export interface AccountAwareRisk {
  buyingPowerAvailable: string;   // formatted value or 'INSUFFICIENT BROKER DATA'
  marginUtilizationPct: number | null; // null = unknown
  netLiquidationValue: string;
  availableFunds: string;
  maintenanceMarginPct: number | null;
  riskCapacityDescription: string;
  warningFlags: string[];
}

const INSUFFICIENT = 'INSUFFICIENT BROKER DATA';

/**
 * Calculates account-aware risk metrics.
 * Never fabricates account values when broker data is unavailable.
 */
export function calculateAccountAwareRisk(
  account: BrokerAccount | null,
  greeks: PortfolioGreeks
): AccountAwareRisk {
  const warnings: string[] = [];

  if (!account) {
    return {
      buyingPowerAvailable: INSUFFICIENT,
      marginUtilizationPct: null,
      netLiquidationValue: INSUFFICIENT,
      availableFunds: INSUFFICIENT,
      maintenanceMarginPct: null,
      riskCapacityDescription:
        'No broker account connected. Connect a broker to see account-aware risk metrics.',
      warningFlags: ['No broker data available.'],
    };
  }

  const buyingPower = isBrokerValueAvailable(account.buyingPower.amount)
    ? formatBrokerMoney(account.buyingPower)
    : INSUFFICIENT;

  const netLiqValue = isBrokerValueAvailable(account.netLiquidationValue.amount)
    ? formatBrokerMoney(account.netLiquidationValue)
    : INSUFFICIENT;

  const availFunds = isBrokerValueAvailable(account.availableFunds.amount)
    ? formatBrokerMoney(account.availableFunds)
    : INSUFFICIENT;

  // Margin utilization = marginUsed / (marginUsed + marginAvailable)
  let marginUtilPct: number | null = null;
  if (
    isBrokerValueAvailable(account.marginUsed.amount) &&
    isBrokerValueAvailable(account.marginAvailable.amount)
  ) {
    const used = account.marginUsed.amount.value!;
    const avail = account.marginAvailable.amount.value!;
    const total = used + avail;
    marginUtilPct = total > 0 ? (used / total) * 100 : 0;

    if (marginUtilPct > 80) {
      warnings.push(
        `Margin utilization is ${marginUtilPct.toFixed(1)}% — approaching broker margin limits.`
      );
    }
  } else {
    warnings.push('Margin utilization could not be calculated — broker margin data unavailable.');
  }

  // Maintenance margin ratio
  let mMargPct: number | null = null;
  if (
    isBrokerValueAvailable(account.maintenanceMarginReq.amount) &&
    isBrokerValueAvailable(account.netLiquidationValue.amount)
  ) {
    const mReq = account.maintenanceMarginReq.amount.value!;
    const nlv = account.netLiquidationValue.amount.value!;
    mMargPct = nlv > 0 ? (mReq / nlv) * 100 : null;
    if (mMargPct !== null && mMargPct > 90) {
      warnings.push(
        `Maintenance margin requirement is ${mMargPct.toFixed(1)}% of net liquidation value — at risk of margin call.`
      );
    }
  }

  // Dollar delta context
  const dollarDelta = Math.abs(greeks.dollarDelta ?? 0);
  if (
    dollarDelta > 0 &&
    isBrokerValueAvailable(account.netLiquidationValue.amount)
  ) {
    const nlv = account.netLiquidationValue.amount.value!;
    const deltaRatio = dollarDelta / nlv;
    if (deltaRatio > 0.5) {
      warnings.push(
        `Portfolio dollar delta ($${dollarDelta.toLocaleString()}) is ${(deltaRatio * 100).toFixed(1)}% of account net liquidation value — high directional exposure.`
      );
    }
  }

  let riskDesc =
    account.provider !== 'UNKNOWN'
      ? `Account data is from ${account.provider} (BROKER-REPORTED).`
      : 'Account data source is UNKNOWN.';

  if (warnings.length === 0) {
    riskDesc += ' No immediate account risk warnings detected.';
  }

  return {
    buyingPowerAvailable: buyingPower,
    marginUtilizationPct: marginUtilPct,
    netLiquidationValue: netLiqValue,
    availableFunds: availFunds,
    maintenanceMarginPct: mMargPct,
    riskCapacityDescription: riskDesc,
    warningFlags: warnings,
  };
}

/**
 * Returns an educational explanation of a broker account field.
 */
export function explainAccountField(field: keyof BrokerAccount): string {
  const explanations: Partial<Record<keyof BrokerAccount, string>> = {
    buyingPower:
      'Buying power is the amount the broker reports as currently available for additional trades. It accounts for settled cash, margin rules, and existing positions.',
    netLiquidationValue:
      'Net liquidation value is the estimated total account value if all positions were closed at current market prices. This is broker-reported and may differ from OptionPlus calculations.',
    cashBalance:
      'Cash balance is the uninvested cash currently held in the account, as reported by the broker.',
    availableFunds:
      'Available funds represent what the broker considers usable for new trades right now, after accounting for existing commitments and margin.',
    maintenanceMarginReq:
      'Maintenance margin is a broker-reported requirement. If your account equity falls below this level, the broker may issue a margin call.',
    marginUsed:
      'Margin used shows how much of your approved margin credit is currently committed to open positions.',
    marginAvailable:
      'Margin available is the remaining margin capacity the broker reports as uncommitted.',
    settledCash:
      'Settled cash is cash from trades that have completed the settlement process and is fully available.',
  };
  return (
    explanations[field] ??
    `This value came directly from the connected broker (${field}).`
  );
}
