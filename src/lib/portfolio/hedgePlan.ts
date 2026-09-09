import { HedgeCandidate, RiskMetric } from './hedgingEngine';
import { PortfolioGreeks } from './types';

export interface HedgePlan {
  id: string;
  timestamp: number;
  metricTargeted: RiskMetric;
  portfolioState: PortfolioGreeks;
  selectedCandidate: HedgeCandidate;
  estimatedCost: number | null;
  expectedResidualRisk: number;
  status: 'DRAFT' | 'EXECUTED' | 'INVALIDATED';
  notes: string;
}

const HEDGE_PLAN_KEY = 'optionplus_hedge_plans';

export function getHedgePlans(): HedgePlan[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(HEDGE_PLAN_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse hedge plans', e);
    return [];
  }
}

export function saveHedgePlan(plan: Omit<HedgePlan, 'id' | 'timestamp'>): HedgePlan {
  const newPlan: HedgePlan = {
    ...plan,
    id: `hp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now()
  };
  
  const current = getHedgePlans();
  current.push(newPlan);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(HEDGE_PLAN_KEY, JSON.stringify(current));
  }
  
  return newPlan;
}

export function updateHedgePlanStatus(id: string, status: HedgePlan['status'], notes?: string): void {
  const current = getHedgePlans();
  const idx = current.findIndex(p => p.id === id);
  if (idx >= 0) {
    current[idx].status = status;
    if (notes) current[idx].notes += `\n${new Date().toISOString()}: ${notes}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(HEDGE_PLAN_KEY, JSON.stringify(current));
    }
  }
}
