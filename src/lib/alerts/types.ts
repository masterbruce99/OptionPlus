export type AlertConditionOperator =
  | 'ABOVE'
  | 'BELOW'
  | 'CROSSED_ABOVE'
  | 'CROSSED_BELOW'
  | 'INCREASED_BY'
  | 'DECREASED_BY'
  | 'CHANGED_BY_PERCENT';

export type AlertType =
  | 'PRICE'
  | 'SPREAD'
  | 'IV'
  | 'GREEK'
  | 'VOLUME'
  | 'OPEN_INTEREST'
  | 'EXPECTED_MOVE'
  | 'PROBABILITY'
  | 'ACTIVITY'
  | 'ARBITRAGE'
  | 'PORTFOLIO'
  | 'EVENT';

export type AlertPriority = 'INFO' | 'NOTICE' | 'WARNING' | 'CRITICAL';
export type AlertState = 'ACTIVE' | 'TRIGGERED' | 'ACKNOWLEDGED' | 'SNOOZED' | 'DISABLED' | 'ERROR';
export type DataFreshness = 'FRESH' | 'STALE' | 'UNKNOWN' | 'UNAVAILABLE';

export interface AlertCondition {
  field: string;
  operator: AlertConditionOperator;
  threshold: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  symbol: string;
  contract?: string; // e.g., 'AAPL250117C00150000'
  conditions: AlertCondition[]; // AND logic applies if multiple
  currentValue?: number | string;
  previousValue?: number | string;
  timestamp: number;
  source: string;
  status: AlertState;
  message?: string;
  priority: AlertPriority;
  
  // Settings
  cooldownMinutes: number;
  expirationDate?: string;
  
  // Internal State (Duplicate-Alert Protection)
  lastTriggeredAt?: number;
  lastObservedValue?: number | string;
  lastState?: boolean;
}

export interface AlertHistoryEvent {
  id: string;
  alertId: string;
  timestamp: number;
  conditionDescription: string;
  previousValue: number | string | null;
  currentValue: number | string | null;
  threshold: number | string;
  source: string;
  status: AlertState;
  explanation: string;
  freshness: DataFreshness;
}
