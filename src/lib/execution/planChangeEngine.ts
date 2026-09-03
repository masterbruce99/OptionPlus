import { PlanChangeRecord, TradePlan } from './types';

export function detectPlanChanges(oldPlan: TradePlan, newPlan: TradePlan): PlanChangeRecord[] {
  const changes: PlanChangeRecord[] = [];

  // Underlying changes
  if (oldPlan.underlying !== newPlan.underlying) {
    changes.push({
      field: 'Underlying',
      oldValue: oldPlan.underlying,
      newValue: newPlan.underlying,
      severity: 'CRITICAL'
    });
  }

  // Execution Quality
  if (oldPlan.executionQuality !== newPlan.executionQuality) {
    let severity: 'INFO' | 'WARN' | 'CRITICAL' = 'INFO';
    if (newPlan.executionQuality === 'BLOCKED' || newPlan.executionQuality === 'INSUFFICIENT_DATA') severity = 'CRITICAL';
    else if (newPlan.executionQuality === 'CAUTION') severity = 'WARN';

    changes.push({
      field: 'Execution Quality',
      oldValue: oldPlan.executionQuality,
      newValue: newPlan.executionQuality,
      severity
    });
  }

  // Limit Price
  const oldLimit = oldPlan.limitPrice.suggestedLimit;
  const newLimit = newPlan.limitPrice.suggestedLimit;

  if (oldLimit !== null && newLimit !== null) {
    const diff = Math.abs(oldLimit - newLimit);
    const percentChange = diff / Math.abs(oldLimit);

    if (percentChange > 0.1) {
      changes.push({
        field: 'Suggested Limit Price',
        oldValue: oldLimit.toFixed(2),
        newValue: newLimit.toFixed(2),
        severity: percentChange > 0.25 ? 'CRITICAL' : 'WARN'
      });
    }
  } else if (oldLimit !== newLimit) {
    changes.push({
      field: 'Suggested Limit Price',
      oldValue: oldLimit === null ? 'Unavailable' : oldLimit.toFixed(2),
      newValue: newLimit === null ? 'Unavailable' : newLimit.toFixed(2),
      severity: 'WARN'
    });
  }

  // Slippage Cost
  const oldCost = oldPlan.slippage.totalExecutionCost;
  const newCost = newPlan.slippage.totalExecutionCost;

  if (oldCost !== null && newCost !== null) {
    if (newCost > oldCost * 1.5) { // 50% increase in slippage
      changes.push({
        field: 'Estimated Slippage Cost',
        oldValue: oldCost.toFixed(2),
        newValue: newCost.toFixed(2),
        severity: 'WARN'
      });
    }
  }

  return changes;
}
