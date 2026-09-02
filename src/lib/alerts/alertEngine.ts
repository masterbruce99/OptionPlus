import { Alert, AlertCondition, AlertConditionOperator, AlertHistoryEvent, DataFreshness, AlertState } from './types';
import { OptionContract, Quote } from '../providers/MarketDataProvider';
import { saveAlertHistoryEvent, saveAlert } from './alertStore';
import { NotificationEngine } from './notificationEngine';

export interface AlertEvaluationContext {
  quote?: Quote | null;
  chain?: OptionContract[];
  // Depending on what else is needed, we could pass activity/arbitrage results or calculate them here.
}

export class AlertEngine {
  static evaluateOperator(operator: AlertConditionOperator, currentValue: number, threshold: number, previousValue?: number): boolean {
    switch (operator) {
      case 'ABOVE': return currentValue > threshold;
      case 'BELOW': return currentValue < threshold;
      case 'CROSSED_ABOVE': return previousValue !== undefined && previousValue <= threshold && currentValue > threshold;
      case 'CROSSED_BELOW': return previousValue !== undefined && previousValue >= threshold && currentValue < threshold;
      case 'INCREASED_BY': return previousValue !== undefined && (currentValue - previousValue) >= threshold;
      case 'DECREASED_BY': return previousValue !== undefined && (previousValue - currentValue) >= threshold;
      case 'CHANGED_BY_PERCENT': {
        if (previousValue === undefined || previousValue === 0) return false;
        const pct = Math.abs((currentValue - previousValue) / previousValue) * 100;
        return pct >= threshold;
      }
      default: return false;
    }
  }

  static getValueFromContext(alert: Alert, condition: AlertCondition, ctx: AlertEvaluationContext): { value: number | null, freshness: DataFreshness } {
    // Basic fields matching module requirements
    if (alert.type === 'PRICE') {
      if (condition.field === 'underlying' && ctx.quote) {
        return { value: ctx.quote.price, freshness: ctx.quote.price !== null ? 'FRESH' : 'UNAVAILABLE' };
      }
      if (alert.contract && ctx.chain) {
        const opt = ctx.chain.find(o => o.symbol === alert.contract);
        if (opt) {
          const val = (opt as any)[condition.field]; // 'bid', 'ask', 'last'
          return { value: typeof val === 'number' ? val : null, freshness: typeof val === 'number' ? 'FRESH' : 'UNAVAILABLE' };
        }
      }
    } else if (alert.type === 'SPREAD' && alert.contract && ctx.chain) {
      const opt = ctx.chain.find(o => o.symbol === alert.contract);
      if (opt && opt.bid !== null && opt.ask !== null) {
        const spread = opt.ask - opt.bid;
        if (condition.field === 'spread %') {
          return { value: opt.ask > 0 ? (spread / opt.ask) * 100 : null, freshness: 'FRESH' };
        }
        return { value: spread, freshness: 'FRESH' };
      }
    } else if (alert.type === 'IV' && alert.contract && ctx.chain) {
      const opt = ctx.chain.find(o => o.symbol === alert.contract);
      if (opt && opt.impliedVolatility !== null && opt.impliedVolatility !== undefined) {
        return { value: opt.impliedVolatility * 100, freshness: 'FRESH' };
      }
    } else if (alert.type === 'GREEK' && alert.contract && ctx.chain) {
      const opt = ctx.chain.find(o => o.symbol === alert.contract);
      if (opt && opt.greeks) {
        let val = null;
        if (condition.field.toLowerCase() === 'delta') val = opt.greeks.delta;
        if (condition.field.toLowerCase() === 'gamma') val = opt.greeks.gamma;
        if (condition.field.toLowerCase() === 'theta') val = opt.greeks.theta;
        if (condition.field.toLowerCase() === 'vega') val = opt.greeks.vega;
        return { value: typeof val === 'number' ? val : null, freshness: typeof val === 'number' ? 'FRESH' : 'UNAVAILABLE' };
      }
    } else if (alert.type === 'VOLUME' && alert.contract && ctx.chain) {
      const opt = ctx.chain.find(o => o.symbol === alert.contract);
      if (opt && opt.volume !== null) {
        return { value: opt.volume, freshness: 'FRESH' };
      }
    } else if (alert.type === 'OPEN_INTEREST' && alert.contract && ctx.chain) {
      const opt = ctx.chain.find(o => o.symbol === alert.contract);
      if (opt && opt.openInterest !== null) {
        return { value: opt.openInterest, freshness: 'FRESH' };
      }
    }
    
    return { value: null, freshness: 'UNAVAILABLE' };
  }

  static evaluateAlert(alert: Alert, ctx: AlertEvaluationContext, enableSound = true): Alert | null {
    if (alert.status === 'DISABLED' || alert.status === 'SNOOZED' || alert.status === 'ACKNOWLEDGED') {
      return null; // Don't trigger if snoozed/disabled/acknowledged
    }

    // Cooldown check
    if (alert.lastTriggeredAt) {
      const msSince = Date.now() - alert.lastTriggeredAt;
      if (msSince < alert.cooldownMinutes * 60 * 1000) {
        return null; // In cooldown
      }
    }

    // Multi-condition AND logic
    let allConditionsMet = true;
    let anyUnverified = false;
    let latestValue: number | null = null;
    let descriptionStr = '';

    for (const cond of alert.conditions) {
      const { value, freshness } = this.getValueFromContext(alert, cond, ctx);
      
      if (freshness === 'UNAVAILABLE' || freshness === 'STALE' || value === null) {
        anyUnverified = true;
        allConditionsMet = false;
        break; // AND condition fails immediately if unverified
      }
      
      // Use the first condition's value as the primary reading for history
      if (latestValue === null) latestValue = value;
      
      const prev = typeof alert.lastObservedValue === 'number' ? alert.lastObservedValue : undefined;
      const met = this.evaluateOperator(cond.operator, value, cond.threshold, prev);
      
      if (!met) {
        allConditionsMet = false;
      }
      
      descriptionStr += `${cond.field} ${cond.operator} ${cond.threshold} `;
    }

    if (anyUnverified) {
      // Do not trigger alerts on missing/invalid data
      return null;
    }

    // False-positive prevention: Condition remaining true does not create repeated notifications
    if (allConditionsMet && alert.lastState === true) {
      return null; 
    }

    // Update alert internal state
    const updatedAlert = { ...alert, lastObservedValue: latestValue !== null ? latestValue : alert.lastObservedValue, lastState: allConditionsMet };
    saveAlert(updatedAlert);

    if (allConditionsMet) {
      const triggeredAlert = { ...updatedAlert, status: 'TRIGGERED' as AlertState, lastTriggeredAt: Date.now() };
      saveAlert(triggeredAlert);
      
      // Save History
      const explanation = `${alert.type} alert triggered. Previous: ${alert.lastObservedValue !== undefined ? alert.lastObservedValue : 'N/A'}, Current: ${latestValue}. Meaning: The condition was met.`;
      const historyEvent: AlertHistoryEvent = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        alertId: alert.id,
        timestamp: Date.now(),
        conditionDescription: descriptionStr.trim(),
        previousValue: alert.lastObservedValue !== undefined ? alert.lastObservedValue : null,
        currentValue: latestValue,
        threshold: alert.conditions[0]?.threshold || 0,
        source: 'Market Data',
        status: 'TRIGGERED',
        explanation,
        freshness: 'FRESH'
      };
      saveAlertHistoryEvent(historyEvent);

      // Notify
      NotificationEngine.notifyBrowser(`OptionPlus Alert: ${alert.symbol}`, explanation);
      if (enableSound) {
        NotificationEngine.playSound();
      }

      return triggeredAlert;
    }

    return null;
  }
}
