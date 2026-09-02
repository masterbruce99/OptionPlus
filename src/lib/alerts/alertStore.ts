import { Alert, AlertHistoryEvent } from './types';

const ALERTS_KEY = 'optionplus_alerts';
const ALERT_HISTORY_KEY = 'optionplus_alert_history';

export function getAlerts(): Alert[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(ALERTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveAlert(alert: Alert): void {
  if (typeof window === 'undefined') return;
  const alerts = getAlerts();
  const existingIndex = alerts.findIndex((a) => a.id === alert.id);
  if (existingIndex >= 0) {
    alerts[existingIndex] = alert;
  } else {
    alerts.push(alert);
  }
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function deleteAlert(id: string): void {
  if (typeof window === 'undefined') return;
  const alerts = getAlerts().filter((a) => a.id !== id);
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function getAlertHistory(): AlertHistoryEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(ALERT_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveAlertHistoryEvent(event: AlertHistoryEvent): void {
  if (typeof window === 'undefined') return;
  const history = getAlertHistory();
  history.unshift(event); // keep newest at top
  // limit history to last 500 events to prevent localstorage bloat
  if (history.length > 500) {
    history.length = 500;
  }
  localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(history));
}

export function clearAlertHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify([]));
}
