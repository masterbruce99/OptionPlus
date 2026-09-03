import { TradePlan } from './types';

const TRADE_PLANS_KEY = 'optionplus_trade_plans';

export function getTradePlans(): TradePlan[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(TRADE_PLANS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to parse trade plans from localStorage', error);
    return [];
  }
}

export function saveTradePlan(plan: Omit<TradePlan, 'id' | 'timestamp'>): TradePlan {
  const plans = getTradePlans();
  const newPlan: TradePlan = {
    ...plan,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    timestamp: Date.now(),
  };
  
  plans.push(newPlan);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(TRADE_PLANS_KEY, JSON.stringify(plans));
  }
  
  return newPlan;
}

export function getTradePlanById(id: string): TradePlan | null {
  const plans = getTradePlans();
  return plans.find((p) => p.id === id) || null;
}

export function deleteTradePlan(id: string): void {
  const plans = getTradePlans().filter((p) => p.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(TRADE_PLANS_KEY, JSON.stringify(plans));
  }
}

export function clearTradePlans(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TRADE_PLANS_KEY);
  }
}
