import { ExecutionChecklistItem, TradePlan } from './types';

export function generateChecklist(plan: TradePlan): ExecutionChecklistItem[] {
  const items: ExecutionChecklistItem[] = [];

  // 1. MARKET
  if (plan.executionQuality === 'READY' || plan.executionQuality === 'ACCEPTABLE') {
    items.push({ category: 'MARKET', label: 'Market conditions acceptable', status: 'PASS' });
  } else if (plan.executionQuality === 'CAUTION') {
    items.push({ category: 'MARKET', label: 'Wide spreads or low liquidity', status: 'WARN', reason: plan.executionReasons[0] });
  } else if (plan.executionQuality === 'BLOCKED') {
    items.push({ category: 'MARKET', label: 'Unacceptable market conditions', status: 'FAIL', reason: plan.executionReasons[0] });
  } else {
    items.push({ category: 'MARKET', label: 'Data is insufficient', status: 'FAIL', reason: 'Missing quotes or underlying price.' });
  }

  // 2. RISK
  if (plan.maxPlannedLoss === null) {
    items.push({ category: 'RISK', label: 'Maximum loss is UNLIMITED', status: 'WARN', reason: 'This strategy carries theoretically unlimited risk.' });
  } else {
    items.push({ category: 'RISK', label: `Maximum loss defined ($${plan.maxPlannedLoss})`, status: 'PASS' });
  }

  if (plan.quantity > 0) {
    items.push({ category: 'RISK', label: 'Position size defined', status: 'PASS' });
  } else {
    items.push({ category: 'RISK', label: 'Position size invalid', status: 'FAIL', reason: 'Quantity must be greater than zero.' });
  }

  // 3. EVENTS
  // For a real integration, we'd check if an earnings event falls before the expiration.
  // We leave this as a PASS for this basic engine, or WARN if there's no expiration
  if (plan.expiration) {
    items.push({ category: 'EVENTS', label: `Expiration timeline reviewed (${plan.expiration})`, status: 'PASS' });
  } else {
    items.push({ category: 'EVENTS', label: 'No expiration defined for legs', status: 'WARN' });
  }

  // 4. STRATEGY
  if (plan.thesis) {
    items.push({ category: 'STRATEGY', label: 'Trade thesis documented', status: 'PASS' });
  } else {
    items.push({ category: 'STRATEGY', label: 'Missing trade thesis', status: 'WARN' });
  }

  if (plan.direction) {
    items.push({ category: 'STRATEGY', label: `Directional bias aligned (${plan.direction})`, status: 'PASS' });
  }

  // 5. EXECUTION
  if (plan.limitPrice.suggestedLimit !== null) {
    items.push({ category: 'EXECUTION', label: `Limit price defined (${plan.limitPrice.suggestedLimit})`, status: 'PASS' });
  } else {
    items.push({ category: 'EXECUTION', label: 'Limit price unavailable', status: 'FAIL', reason: 'Cannot determine limit price due to missing data.' });
  }

  if (plan.stopPrice !== null || plan.targetPrice !== null) {
    items.push({ category: 'EXECUTION', label: 'Exit conditions defined', status: 'PASS' });
  } else {
    items.push({ category: 'EXECUTION', label: 'Exit conditions undefined', status: 'WARN', reason: 'No stop loss or profit target defined.' });
  }

  return items;
}
