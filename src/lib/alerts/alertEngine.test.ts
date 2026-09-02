import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AlertEngine } from './alertEngine';
import { Alert } from './types';

describe('AlertEngine - Operator Evaluation', () => {
  it('evaluates ABOVE', () => {
    assert.strictEqual(AlertEngine.evaluateOperator('ABOVE', 10, 5), true);
    assert.strictEqual(AlertEngine.evaluateOperator('ABOVE', 5, 10), false);
  });

  it('evaluates CROSSED_ABOVE', () => {
    assert.strictEqual(AlertEngine.evaluateOperator('CROSSED_ABOVE', 11, 10, 9), true);
    assert.strictEqual(AlertEngine.evaluateOperator('CROSSED_ABOVE', 11, 10, 11), false);
    assert.strictEqual(AlertEngine.evaluateOperator('CROSSED_ABOVE', 11, 10, undefined), false);
  });

  it('evaluates CHANGED_BY_PERCENT', () => {
    assert.strictEqual(AlertEngine.evaluateOperator('CHANGED_BY_PERCENT', 110, 10, 100), true);
    assert.strictEqual(AlertEngine.evaluateOperator('CHANGED_BY_PERCENT', 105, 10, 100), false);
  });
});

describe('AlertEngine - Evaluation and False Positive Protection', () => {
  it('does not trigger on unavailable data', () => {
    const alert: Alert = {
      id: '1', type: 'PRICE', symbol: 'AAPL', contract: 'AAPL250101C150', status: 'ACTIVE', priority: 'INFO', cooldownMinutes: 0,
      conditions: [{ field: 'bid', operator: 'ABOVE', threshold: 5 }],
      timestamp: Date.now(), source: 'Test'
    };
    
    // Contract not in chain
    const ctx = { chain: [] };
    const res = AlertEngine.evaluateAlert(alert, ctx, false);
    assert.strictEqual(res, null);
  });

  it('triggers when condition is met and prevents repeated triggers', () => {
    let alert: Alert = {
      id: '2', type: 'PRICE', symbol: 'AAPL', status: 'ACTIVE', priority: 'INFO', cooldownMinutes: 0,
      conditions: [{ field: 'underlying', operator: 'ABOVE', threshold: 150 }],
      timestamp: Date.now(), source: 'Test'
    };
    
    const ctx1 = { quote: { symbol: 'AAPL', price: 155, change: 0, changePercentage: 0, volume: 100 } };
    
    // First evaluation: True
    const triggered = AlertEngine.evaluateAlert(alert, ctx1, false);
    assert.ok(triggered !== null);
    assert.strictEqual(triggered?.status, 'TRIGGERED');
    
    // Second evaluation with same context and state: Should not trigger again
    alert = { ...alert, lastState: true, lastObservedValue: 155 };
    const notTriggered = AlertEngine.evaluateAlert(alert, ctx1, false);
    assert.strictEqual(notTriggered, null);
  });

  it('handles multiple conditions (AND)', () => {
    const alert: Alert = {
      id: '3', type: 'PRICE', symbol: 'AAPL', status: 'ACTIVE', priority: 'INFO', cooldownMinutes: 0,
      conditions: [
        { field: 'underlying', operator: 'ABOVE', threshold: 150 },
        { field: 'underlying', operator: 'BELOW', threshold: 200 }
      ],
      timestamp: Date.now(), source: 'Test'
    };
    
    const ctxPass = { quote: { symbol: 'AAPL', price: 160, change: 0, changePercentage: 0, volume: 100 } };
    assert.ok(AlertEngine.evaluateAlert(alert, ctxPass, false));
    
    const ctxFail = { quote: { symbol: 'AAPL', price: 210, change: 0, changePercentage: 0, volume: 100 } };
    assert.strictEqual(AlertEngine.evaluateAlert(alert, ctxFail, false), null);
  });
});
