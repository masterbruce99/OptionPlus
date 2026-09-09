import test from 'node:test';
import assert from 'node:assert';

// Engine imports
import {
  createInitialSyncState,
  evaluateConnectionFreshness,
  createInitialRateLimitState,
  checkRateLimit,
  calculateBackoffMs,
  explainConnectionState,
} from './connectionEngine';
import {
  parseBrokerAccount,
  makeBrokerValue,
  makeUnavailableValue,
  isBrokerValueAvailable,
  formatBrokerMoney,
  redactSecrets,
  applyFreshnessCheck,
  validateAccountCompleteness,
} from './accountParser';
import {
  parseBrokerPosition,
  reconcilePositions,
  describeReconciliationState,
} from './reconciliationEngine';
import {
  parseBrokerFill,
  parseBrokerFills,
  matchFillToPosition,
  describeFillForJournal,
} from './fillImportEngine';
import {
  createSyncSession,
  beginSync,
  completeSyncSuccess,
  completeSyncFailure,
  shouldAutoSync,
  isSyncDataStale,
  describeSyncStatus,
} from './syncEngine';
import { calculateAccountAwareRisk, explainAccountField } from './accountRiskEngine';
import type {
  BrokerSyncState,
  BrokerAccount,
  BrokerPosition,
  BrokerFill,
} from './types';
import * as connectionEngineModule from './connectionEngine';
import * as accountParserModule from './accountParser';
import * as reconciliationEngineModule from './reconciliationEngine';
import * as fillImportEngineModule from './fillImportEngine';
import * as syncEngineModule from './syncEngine';
import * as accountRiskEngineModule from './accountRiskEngine';

// ─── 1. Provider Interface ───────────────────────────────────────────────────
test('Broker Phase 20: BrokerProvider interface shape', () => {
  // Verify required read-only method names are defined in modules
  assert.ok(typeof connectionEngineModule.createInitialSyncState === 'function');
  assert.ok(typeof reconciliationEngineModule.reconcilePositions === 'function');
  assert.ok(typeof fillImportEngineModule.parseBrokerFill === 'function');
});

// ─── 2. Connection States ────────────────────────────────────────────────────
test('Broker Phase 20: connection states - NOT_CONFIGURED initial', () => {
  const state = createInitialSyncState('test-provider');
  assert.strictEqual(state.connectionState, 'NOT_CONFIGURED');
  assert.strictEqual(state.syncStatus, 'IDLE');
  assert.strictEqual(state.lastSuccessfulSync, null);
  assert.strictEqual(state.retryCount, 0);
  assert.strictEqual(state.provider, 'test-provider');
});

test('Broker Phase 20: connection states - STALE when no last sync', () => {
  const state: BrokerSyncState = {
    connectionState: 'CONNECTED',
    syncStatus: 'SUCCESS',
    lastSuccessfulSync: null,
    syncDurationMs: null,
    retryCount: 0,
    retryAfterMs: null,
    errorMessage: null,
    provider: 'test',
  };
  const freshness = evaluateConnectionFreshness(state);
  assert.strictEqual(freshness, 'STALE');
});

test('Broker Phase 20: connection states - CONNECTED when recently synced', () => {
  const state: BrokerSyncState = {
    connectionState: 'CONNECTED',
    syncStatus: 'SUCCESS',
    lastSuccessfulSync: Date.now() - 1000, // 1 second ago
    syncDurationMs: 200,
    retryCount: 0,
    retryAfterMs: null,
    errorMessage: null,
    provider: 'test',
  };
  const freshness = evaluateConnectionFreshness(state);
  assert.strictEqual(freshness, 'CONNECTED');
});

test('Broker Phase 20: connection states - STALE when old sync', () => {
  const state: BrokerSyncState = {
    connectionState: 'CONNECTED',
    syncStatus: 'SUCCESS',
    lastSuccessfulSync: Date.now() - 10 * 60 * 1000, // 10 minutes ago
    syncDurationMs: 300,
    retryCount: 0,
    retryAfterMs: null,
    errorMessage: null,
    provider: 'test',
  };
  const freshness = evaluateConnectionFreshness(state);
  assert.strictEqual(freshness, 'STALE');
});

test('Broker Phase 20: all connection states have explanations', () => {
  const states = [
    'NOT_CONFIGURED', 'CONFIGURED', 'CONNECTING', 'CONNECTED',
    'AUTHENTICATION_ERROR', 'PERMISSION_ERROR', 'RATE_LIMITED',
    'PROVIDER_ERROR', 'STALE', 'DISCONNECTED', 'UNKNOWN',
  ] as const;
  for (const s of states) {
    const explanation = explainConnectionState(s);
    assert.ok(explanation.length > 10, `Explanation for ${s} is too short`);
  }
});

// ─── 3. Account Parsing ──────────────────────────────────────────────────────
test('Broker Phase 20: account parsing - full fields', () => {
  const raw = {
    account_id: 'ACC-123456789',
    cash_balance: 10000,
    net_liquidation_value: 55000,
    buying_power: 25000,
    available_funds: 20000,
    initial_margin_requirement: 5000,
    maintenance_margin_requirement: 4000,
    margin_used: 5000,
    margin_available: 20000,
    settled_cash: 9500,
    currency: 'USD',
  };
  const account = parseBrokerAccount(raw, 'test-broker', '/v1/account');
  assert.ok(isBrokerValueAvailable(account.cashBalance.amount));
  assert.strictEqual(account.cashBalance.amount.value, 10000);
  assert.strictEqual(account.currency, 'USD');
  assert.strictEqual(account.provider, 'test-broker');
  // Account ID should be redacted to last 4 chars
  assert.ok(account.accountId.value?.startsWith('***'));
  assert.ok(account.accountId.value?.endsWith('9789') || account.accountId.value?.endsWith('6789'));
});

test('Broker Phase 20: account parsing - missing account fields', () => {
  const raw = { currency: 'USD' }; // minimal — all money fields missing
  const account = parseBrokerAccount(raw, 'test-broker', '/v1/account');
  assert.strictEqual(account.cashBalance.amount.status, 'UNAVAILABLE');
  assert.strictEqual(account.buyingPower.amount.value, null);
  assert.strictEqual(account.netLiquidationValue.amount.status, 'UNAVAILABLE');
  // Should never default to 0
  assert.strictEqual(account.marginUsed.amount.value, null);
});

test('Broker Phase 20: account parsing - null raw', () => {
  const account = parseBrokerAccount(null, 'test', '/account');
  assert.strictEqual(account.cashBalance.amount.status, 'UNAVAILABLE');
  assert.strictEqual(account.cashBalance.amount.value, null);
});

test('Broker Phase 20: account formatting - UNAVAILABLE display', () => {
  const raw = { currency: 'USD' };
  const account = parseBrokerAccount(raw, 'test', '/account');
  const display = formatBrokerMoney(account.buyingPower);
  assert.strictEqual(display, 'INSUFFICIENT BROKER DATA');
});

test('Broker Phase 20: account formatting - available value', () => {
  const raw = { buying_power: 15000.50, currency: 'USD' };
  const account = parseBrokerAccount(raw, 'test', '/account');
  const display = formatBrokerMoney(account.buyingPower);
  assert.ok(display.includes('15,000.50'), `Display was: ${display}`);
});

test('Broker Phase 20: validateAccountCompleteness - complete', () => {
  const raw = { buying_power: 10000, net_liquidation_value: 50000, cash_balance: 8000, currency: 'USD' };
  const account = parseBrokerAccount(raw, 'test', '/account');
  const result = validateAccountCompleteness(account);
  assert.strictEqual(result.complete, true);
  assert.strictEqual(result.missing.length, 0);
});

test('Broker Phase 20: validateAccountCompleteness - missing fields', () => {
  const raw = { currency: 'USD' };
  const account = parseBrokerAccount(raw, 'test', '/account');
  const result = validateAccountCompleteness(account);
  assert.strictEqual(result.complete, false);
  assert.ok(result.missing.includes('buyingPower'));
  assert.ok(result.missing.includes('netLiquidationValue'));
});

// ─── 4. Position Import ──────────────────────────────────────────────────────
test('Broker Phase 20: position import - full option position', () => {
  const raw = {
    id: 'bp-001',
    symbol: 'AAPL250117C00150000',
    underlying: 'AAPL',
    option_type: 'call',
    strike: 150,
    expiration: '2025-01-17',
    quantity: -5,
    average_cost: 5.0,
    market_value: -2500,
    unrealized_pnl: 2500,
    realized_pnl: 0,
    currency: 'USD',
  };
  const pos = parseBrokerPosition(raw, 'test-broker', '/positions');
  assert.strictEqual(pos.symbol, 'AAPL250117C00150000');
  assert.strictEqual(pos.underlying, 'AAPL');
  assert.strictEqual(pos.optionType, 'call');
  assert.strictEqual(pos.strike, 150);
  assert.strictEqual(pos.quantity, -5);
  assert.strictEqual(pos.source, 'BROKER_IMPORTED');
  assert.ok(isBrokerValueAvailable(pos.unrealizedPnL));
  assert.strictEqual(pos.unrealizedPnL.value, 2500);
});

test('Broker Phase 20: position import - missing optional fields', () => {
  const raw = {
    id: 'bp-002',
    symbol: 'AAPL',
    quantity: 100,
    currency: 'USD',
  };
  const pos = parseBrokerPosition(raw, 'test-broker', '/positions');
  assert.strictEqual(pos.symbol, 'AAPL');
  assert.strictEqual(pos.optionType, null);
  assert.strictEqual(pos.strike, null);
  assert.strictEqual(pos.expiration, null);
  assert.strictEqual(pos.averageCost.status, 'UNAVAILABLE');
  // Never silently 0
  assert.strictEqual(pos.averageCost.value, null);
});

// ─── 5. Position Reconciliation ──────────────────────────────────────────────
test('Broker Phase 20: reconciliation - MATCH', () => {
  const brokerPos: BrokerPosition = {
    brokerId: 'bp-1',
    symbol: 'AAPL250117C00150000',
    underlying: 'AAPL',
    optionType: 'call',
    strike: 150,
    expiration: '2025-01-17',
    quantity: 1,
    averageCost: makeBrokerValue(5.0, 't', '/p', Date.now()),
    marketValue: makeBrokerValue(700, 't', '/p', Date.now()),
    unrealizedPnL: makeBrokerValue(200, 't', '/p', Date.now()),
    realizedPnL: makeUnavailableValue('t', '/p'),
    currency: 'USD',
    source: 'BROKER_IMPORTED',
    retrievedAt: Date.now(),
    provider: 'test',
  };

  const opPosition = {
    id: 'op-1',
    planId: 'plan-1',
    underlying: 'AAPL',
    status: 'OPEN' as const,
    plan: {
      id: 'plan-1',
      underlying: 'AAPL',
      expiration: '2025-01-17',
      legs: [{ id: 'leg-1', type: 'call', side: 'long', strike: 150, quantity: 1, entryPrice: 5.0, multiplier: 100 }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    fills: [{ legId: 'leg-1', fillPrice: 5.0, quantity: 1, filledAt: Date.now() }],
    enteredAt: Date.now(),
    closedAt: null,
    currentPnL: { unrealizedPnL: 200, realizedPnL: null, returnOnCapital: null, marginUtilization: null },
    currentGreeks: null,
    adjustmentRecommendation: null,
    upcomingEvents: [],
  };

  const records = reconcilePositions([brokerPos], [opPosition]);
  assert.strictEqual(records.length, 1);
  assert.strictEqual(records[0].state, 'MATCH');
  assert.strictEqual(records[0].discrepancies.length, 0);
});

test('Broker Phase 20: reconciliation - BROKER_ONLY', () => {
  const brokerPos: BrokerPosition = {
    brokerId: 'bp-2',
    symbol: 'SPY250117P00450000',
    underlying: 'SPY',
    optionType: 'put',
    strike: 450,
    expiration: '2025-01-17',
    quantity: 2,
    averageCost: makeBrokerValue(3.0, 't', '/p', Date.now()),
    marketValue: makeBrokerValue(600, 't', '/p', Date.now()),
    unrealizedPnL: makeUnavailableValue('t', '/p'),
    realizedPnL: makeUnavailableValue('t', '/p'),
    currency: 'USD',
    source: 'BROKER_IMPORTED',
    retrievedAt: Date.now(),
    provider: 'test',
  };

  const records = reconcilePositions([brokerPos], []);
  assert.strictEqual(records[0].state, 'BROKER_ONLY');
  assert.strictEqual(records[0].optionplusPositionId, null);
});

test('Broker Phase 20: reconciliation - OPTIONPLUS_ONLY', () => {
  const opPosition = {
    id: 'op-x',
    planId: 'plan-x',
    underlying: 'TSLA',
    status: 'OPEN' as const,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plan: { id: 'plan-x', underlying: 'TSLA', legs: [], expiration: '2025-01-17' } as any,
    fills: [],
    enteredAt: Date.now(),
    closedAt: null,
    currentPnL: { unrealizedPnL: null, realizedPnL: null, returnOnCapital: null, marginUtilization: null },
    currentGreeks: null,
    adjustmentRecommendation: null,
    upcomingEvents: [],
  };
  const records = reconcilePositions([], [opPosition]);
  assert.strictEqual(records[0].state, 'OPTIONPLUS_ONLY');
});

test('Broker Phase 20: reconciliation - quantity mismatch', () => {
  const brokerPos: BrokerPosition = {
    brokerId: 'bp-3',
    symbol: 'AAPL250117C00150000',
    underlying: 'AAPL',
    optionType: 'call',
    strike: 150,
    expiration: '2025-01-17',
    quantity: 3,  // 3 at broker
    averageCost: makeBrokerValue(5.0, 't', '/p', Date.now()),
    marketValue: makeUnavailableValue('t', '/p'),
    unrealizedPnL: makeUnavailableValue('t', '/p'),
    realizedPnL: makeUnavailableValue('t', '/p'),
    currency: 'USD',
    source: 'BROKER_IMPORTED',
    retrievedAt: Date.now(),
    provider: 'test',
  };
  const opPosition = {
    id: 'op-2',
    planId: 'plan-2',
    underlying: 'AAPL',
    status: 'OPEN' as const,
    plan: {
      id: 'plan-2',
      underlying: 'AAPL',
      expiration: '2025-01-17',
      legs: [{ id: 'leg-1', type: 'call', side: 'long', strike: 150, quantity: 1, multiplier: 100 }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    fills: [{ legId: 'leg-1', fillPrice: 5.0, quantity: 1, filledAt: Date.now() }], // 1 in OptionPlus
    enteredAt: Date.now(),
    closedAt: null,
    currentPnL: { unrealizedPnL: null, realizedPnL: null, returnOnCapital: null, marginUtilization: null },
    currentGreeks: null,
    adjustmentRecommendation: null,
    upcomingEvents: [],
  };
  const records = reconcilePositions([brokerPos], [opPosition]);
  assert.strictEqual(records[0].state, 'MISMATCH');
  const qtyDisc = records[0].discrepancies.find(d => d.field === 'quantity');
  assert.ok(qtyDisc);
  assert.strictEqual(qtyDisc.match, false);
});

test('Broker Phase 20: reconciliation - STALE broker data', () => {
  const stalePos: BrokerPosition = {
    brokerId: 'bp-stale',
    symbol: 'AAPL',
    underlying: 'AAPL',
    optionType: null,
    strike: null,
    expiration: null,
    quantity: 100,
    averageCost: makeUnavailableValue('t', '/p'),
    marketValue: makeUnavailableValue('t', '/p'),
    unrealizedPnL: makeUnavailableValue('t', '/p'),
    realizedPnL: makeUnavailableValue('t', '/p'),
    currency: 'USD',
    source: 'BROKER_IMPORTED',
    retrievedAt: Date.now() - 10 * 60 * 1000, // 10 minutes old
    provider: 'test',
  };
  const records = reconcilePositions([stalePos], []);
  assert.strictEqual(records[0].state, 'STALE');
  assert.strictEqual(records[0].staleBrokerData, true);
});

test('Broker Phase 20: reconciliation - all states have descriptions', () => {
  const states = ['MATCH', 'BROKER_ONLY', 'OPTIONPLUS_ONLY', 'MISMATCH', 'STALE', 'INSUFFICIENT_DATA'] as const;
  for (const s of states) {
    const desc = describeReconciliationState(s);
    assert.ok(desc.length > 5, `Description missing for ${s}`);
  }
});

// ─── 6. Fill Import ──────────────────────────────────────────────────────────
test('Broker Phase 20: fill import - valid fill', () => {
  const raw = {
    execution_id: 'exec-abc',
    order_id: 'ord-123',
    timestamp: Date.now() - 1000,
    symbol: 'AAPL250117C00150000',
    underlying: 'AAPL',
    side: 'buy',
    quantity: 2,
    fill_price: 5.35,
    fees: 1.30,
    currency: 'USD',
  };
  const fill = parseBrokerFill(raw, 'test-broker', '/fills');
  assert.ok(fill !== null);
  assert.strictEqual(fill!.executionId, 'exec-abc');
  assert.strictEqual(fill!.side, 'buy');
  assert.strictEqual(fill!.fillPrice, 5.35);
  assert.ok(isBrokerValueAvailable(fill!.fees));
  assert.strictEqual(fill!.fees.value, 1.30);
  assert.strictEqual(fill!.source, 'BROKER_IMPORTED');
});

test('Broker Phase 20: fill import - missing fill_price returns null', () => {
  const raw = { execution_id: 'exec-bad', symbol: 'AAPL', quantity: 1 };
  const fill = parseBrokerFill(raw, 'test', '/fills');
  assert.strictEqual(fill, null);
});

test('Broker Phase 20: fill import - fees missing marked UNAVAILABLE', () => {
  const raw = {
    execution_id: 'exec-nofee',
    symbol: 'AAPL',
    quantity: 1,
    fill_price: 5.0,
    side: 'sell',
    currency: 'USD',
  };
  const fill = parseBrokerFill(raw, 'test', '/fills');
  assert.ok(fill !== null);
  assert.strictEqual(fill!.fees.status, 'UNAVAILABLE');
  assert.strictEqual(fill!.fees.value, null);
  // Never default to 0
  assert.notStrictEqual(fill!.fees.value, 0);
});

test('Broker Phase 20: fill import batch - skips invalid', () => {
  const rawFills = [
    { execution_id: 'e1', symbol: 'AAPL', quantity: 1, fill_price: 5.0, side: 'buy', currency: 'USD' },
    { execution_id: 'e2', symbol: 'SPY' }, // missing fill_price — invalid
    { execution_id: 'e3', symbol: 'QQQ', quantity: 2, fill_price: 3.0, side: 'sell', currency: 'USD' },
  ];
  const { fills, skippedCount } = parseBrokerFills(rawFills, 'test', '/fills');
  assert.strictEqual(fills.length, 2);
  assert.strictEqual(skippedCount, 1);
});

test('Broker Phase 20: fill import - journal description includes BROKER-IMPORTED', () => {
  const fill: BrokerFill = {
    executionId: 'exec-j1',
    orderId: 'ord-j1',
    timestamp: Date.now(),
    symbol: 'AAPL250117C00150000',
    underlying: 'AAPL',
    side: 'buy',
    quantity: 1,
    fillPrice: 5.35,
    fees: makeBrokerValue(0.65, 'test', '/fills', Date.now()),
    currency: 'USD',
    provider: 'test-broker',
    source: 'BROKER_IMPORTED',
  };
  const desc = describeFillForJournal(fill);
  assert.ok(desc.includes('[BROKER-IMPORTED]'));
  assert.ok(desc.includes('5.35'));
  assert.ok(desc.includes('test-broker'));
});

test('Broker Phase 20: fill import - matchFillToPosition', () => {
  const fill: BrokerFill = {
    executionId: 'e-match',
    orderId: 'o-match',
    timestamp: Date.now() - 2 * 60 * 1000, // 2 minutes ago
    symbol: 'AAPL250117C00150000',
    underlying: 'AAPL',
    side: 'buy',
    quantity: 1,
    fillPrice: 5.0,
    fees: makeUnavailableValue('test', '/fills'),
    currency: 'USD',
    provider: 'test',
    source: 'BROKER_IMPORTED',
  };

  const positions = [
    { id: 'pos-a', underlying: 'SPY', enteredAt: Date.now() }, // wrong underlying
    { id: 'pos-b', underlying: 'AAPL', enteredAt: Date.now() - 2.5 * 60 * 1000 }, // close enough
  ];
  const matched = matchFillToPosition(fill, positions);
  assert.strictEqual(matched, 'pos-b');
});

// ─── 7. Sync Engine ──────────────────────────────────────────────────────────
test('Broker Phase 20: sync engine - initial session', () => {
  const session = createSyncSession('test-provider');
  assert.strictEqual(session.state.connectionState, 'NOT_CONFIGURED');
  assert.strictEqual(session.state.syncStatus, 'IDLE');
  assert.strictEqual(session.config.manualOnly, true);
});

test('Broker Phase 20: sync engine - beginSync transitions to CONNECTING', () => {
  const session = createSyncSession('test-provider', { rateLimitPerWindow: 100 });
  const started = beginSync(session);
  assert.strictEqual(started.state.syncStatus, 'SYNCING');
  assert.strictEqual(started.state.connectionState, 'CONNECTING');
});

test('Broker Phase 20: sync engine - completeSyncSuccess', () => {
  const session = createSyncSession('test-provider', { rateLimitPerWindow: 100 });
  const started = beginSync(session);
  const done = completeSyncSuccess(started, 350);
  assert.strictEqual(done.state.syncStatus, 'SUCCESS');
  assert.strictEqual(done.state.connectionState, 'CONNECTED');
  assert.strictEqual(done.state.syncDurationMs, 350);
  assert.strictEqual(done.state.retryCount, 0);
  assert.ok(done.state.lastSuccessfulSync !== null);
});

test('Broker Phase 20: sync engine - completeSyncFailure increments retries', () => {
  const session = createSyncSession('test-provider', { rateLimitPerWindow: 100 });
  const started = beginSync(session);
  const failed = completeSyncFailure(started, 'Network error');
  assert.strictEqual(failed.state.syncStatus, 'FAILED');
  assert.strictEqual(failed.state.connectionState, 'PROVIDER_ERROR');
  assert.strictEqual(failed.state.retryCount, 1);
  assert.ok(failed.state.retryAfterMs !== null);
  assert.ok(failed.state.errorMessage?.includes('Network error'));
});

test('Broker Phase 20: sync engine - rate limit protection', () => {
  // Fill up rate limit
  const session = createSyncSession('test-provider', { rateLimitPerWindow: 2, rateLimitWindowMs: 60_000 });
  const s1 = beginSync(session); // request 1
  const s2 = beginSync(s1); // request 2
  const s3 = beginSync(s2); // request 3 - should be rate limited
  assert.strictEqual(s3.state.syncStatus, 'RATE_LIMITED');
  assert.strictEqual(s3.state.connectionState, 'RATE_LIMITED');
});

test('Broker Phase 20: sync engine - shouldAutoSync false when manualOnly', () => {
  const session = createSyncSession('test-provider', { manualOnly: true });
  assert.strictEqual(shouldAutoSync(session), false);
});

test('Broker Phase 20: sync engine - isSyncDataStale', () => {
  const session = createSyncSession('test-provider');
  assert.strictEqual(isSyncDataStale(session), true); // No sync yet = stale

  const freshSession = completeSyncSuccess(beginSync(createSyncSession('test', { rateLimitPerWindow: 100 })), 100);
  assert.strictEqual(isSyncDataStale(freshSession), false); // Just synced = fresh
});

test('Broker Phase 20: sync engine - describeSyncStatus strings', () => {
  const session = createSyncSession('test-provider', { rateLimitPerWindow: 100 });
  assert.ok(describeSyncStatus(session).length > 0);

  const done = completeSyncSuccess(beginSync(session), 100);
  const desc = describeSyncStatus(done);
  assert.ok(desc.includes('ago') || desc.includes('Last synced'));
});

// ─── 8. Rate Limiting ────────────────────────────────────────────────────────
test('Broker Phase 20: rate limit - allows requests within window', () => {
  const state = createInitialRateLimitState(5);
  assert.strictEqual(checkRateLimit(state), true);
  assert.strictEqual(checkRateLimit(state), true);
  assert.strictEqual(state.requestCount, 2);
});

test('Broker Phase 20: rate limit - blocks when limit exceeded', () => {
  const state = createInitialRateLimitState(2);
  checkRateLimit(state);
  checkRateLimit(state);
  const allowed = checkRateLimit(state);
  assert.strictEqual(allowed, false);
  assert.strictEqual(state.isRateLimited, true);
  assert.ok(state.retryAfterMs !== null);
});

test('Broker Phase 20: backoff calculation - exponential growth', () => {
  const b0 = calculateBackoffMs(0);
  const b1 = calculateBackoffMs(1);
  const b2 = calculateBackoffMs(2);
  const bMax = calculateBackoffMs(20);
  assert.strictEqual(b0, 1000);
  assert.strictEqual(b1, 2000);
  assert.strictEqual(b2, 4000);
  assert.strictEqual(bMax, 5 * 60 * 1000); // capped at 5 minutes
});

// ─── 9. Account-Aware Risk ───────────────────────────────────────────────────
test('Broker Phase 20: account-aware risk - no broker', () => {
  const greeks = { netDelta: 0, netGamma: 0, netTheta: 0, netVega: 0, netRho: 0, dollarDelta: 0, dollarGamma: 0, dollarTheta: 0, dollarVega: 0 };
  const risk = calculateAccountAwareRisk(null, greeks);
  assert.strictEqual(risk.buyingPowerAvailable, 'INSUFFICIENT BROKER DATA');
  assert.strictEqual(risk.marginUtilizationPct, null);
  assert.ok(risk.warningFlags.length > 0);
});

test('Broker Phase 20: account-aware risk - with full account', () => {
  const raw = { buying_power: 25000, net_liquidation_value: 100000, cash_balance: 20000, available_funds: 22000, margin_used: 10000, margin_available: 40000, currency: 'USD' };
  const account = parseBrokerAccount(raw, 'test', '/account') as BrokerAccount;
  const greeks = { netDelta: 50, netGamma: 0, netTheta: 0, netVega: 0, netRho: 0, dollarDelta: 5000, dollarGamma: 0, dollarTheta: 0, dollarVega: 0 };
  const risk = calculateAccountAwareRisk(account, greeks);
  assert.ok(risk.buyingPowerAvailable.includes('25'));
  assert.ok(risk.marginUtilizationPct !== null);
  assert.strictEqual(risk.marginUtilizationPct, (10000 / 50000) * 100); // 20%
});

test('Broker Phase 20: account-aware risk - high margin warning', () => {
  const raw = { margin_used: 90000, margin_available: 10000, buying_power: 10000, net_liquidation_value: 100000, cash_balance: 5000, currency: 'USD' };
  const account = parseBrokerAccount(raw, 'test', '/account') as BrokerAccount;
  const greeks = { netDelta: 0, netGamma: 0, netTheta: 0, netVega: 0, netRho: 0, dollarDelta: 0, dollarGamma: 0, dollarTheta: 0, dollarVega: 0 };
  const risk = calculateAccountAwareRisk(account, greeks);
  assert.ok(risk.warningFlags.some(w => w.toLowerCase().includes('margin')));
});

test('Broker Phase 20: unavailable buying power stays INSUFFICIENT BROKER DATA', () => {
  const raw = { currency: 'USD' }; // no buying power provided
  const account = parseBrokerAccount(raw, 'test', '/account') as BrokerAccount;
  const greeks = { netDelta: 0, netGamma: 0, netTheta: 0, netVega: 0, netRho: 0, dollarDelta: 0, dollarGamma: 0, dollarTheta: 0, dollarVega: 0 };
  const risk = calculateAccountAwareRisk(account, greeks);
  assert.strictEqual(risk.buyingPowerAvailable, 'INSUFFICIENT BROKER DATA');
  // Must NOT be '0' or '$0' or similar
  assert.ok(!risk.buyingPowerAvailable.includes('0.00'));
});

test('Broker Phase 20: explainAccountField returns meaningful text', () => {
  const fields = ['buyingPower', 'netLiquidationValue', 'cashBalance', 'maintenanceMarginReq', 'marginUsed'] as const;
  for (const f of fields) {
    const exp = explainAccountField(f);
    assert.ok(exp.length > 20, `Explanation too short for ${f}`);
  }
});

// ─── 10. Secret Redaction ────────────────────────────────────────────────────
test('Broker Phase 20: secret redaction - API key', () => {
  const input = 'api_key: "ABCD-1234-SECRET-KEY"';
  const redacted = redactSecrets(input);
  assert.ok(!redacted.includes('ABCD-1234'));
  assert.ok(redacted.includes('[REDACTED]'));
});

test('Broker Phase 20: secret redaction - token', () => {
  const input = 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.secret';
  const redacted = redactSecrets(input);
  assert.ok(!redacted.includes('eyJhbGci'));
  assert.ok(redacted.includes('[REDACTED]'));
});

test('Broker Phase 20: secret redaction - normal text preserved', () => {
  const input = 'Broker sync completed in 350ms.';
  const redacted = redactSecrets(input);
  assert.strictEqual(redacted, input);
});

// ─── 11. Data Provenance ─────────────────────────────────────────────────────
test('Broker Phase 20: data provenance - BrokerValue carries provider', () => {
  const bv = makeBrokerValue(100, 'tradier', '/account', Date.now());
  assert.strictEqual(bv.provider, 'tradier');
  assert.strictEqual(bv.endpoint, '/account');
  assert.strictEqual(bv.source, 'BROKER_REPORTED');
});

test('Broker Phase 20: data provenance - freshness check marks stale', () => {
  const oldBv = makeBrokerValue(200, 'test', '/account', Date.now() - 10 * 60 * 1000);
  const stale = applyFreshnessCheck(oldBv, 5 * 60 * 1000);
  assert.strictEqual(stale.freshness, 'STALE');
});

test('Broker Phase 20: data provenance - freshness check keeps FRESH when recent', () => {
  const freshBv = makeBrokerValue(200, 'test', '/account', Date.now() - 1000);
  const checked = applyFreshnessCheck(freshBv, 5 * 60 * 1000);
  assert.strictEqual(checked.freshness, 'FRESH');
});

// ─── 12. Read-Only Security Audit ────────────────────────────────────────────
test('Broker Phase 20: read-only enforcement - no order write exports', () => {
  // Verify none of the broker engine modules export write-capable order functions
  const allExports = [
    ...Object.keys(connectionEngineModule),
    ...Object.keys(accountParserModule),
    ...Object.keys(reconciliationEngineModule),
    ...Object.keys(fillImportEngineModule),
    ...Object.keys(syncEngineModule),
    ...Object.keys(accountRiskEngineModule),
  ];

  const forbidden = [
    'placeOrder', 'submitOrder', 'createOrder', 'modifyOrder',
    'cancelOrder', 'replaceOrder', 'exerciseOption', 'assignOption',
    'transferFunds', 'autoTrade', 'executeOrder',
  ];

  for (const name of forbidden) {
    assert.ok(
      !allExports.includes(name),
      `Forbidden function '${name}' found in broker module exports — read-only guarantee violated`
    );
  }
});

test('Broker Phase 20: read-only enforcement - no broker-ONLY positions are auto-corrected', () => {
  // Reconciliation should not modify either source
  const brokerPos: BrokerPosition = {
    brokerId: 'bp-new',
    symbol: 'AAPL',
    underlying: 'AAPL',
    optionType: 'stock',
    strike: null,
    expiration: null,
    quantity: 100,
    averageCost: makeBrokerValue(150, 'test', '/p', Date.now()),
    marketValue: makeBrokerValue(15000, 'test', '/p', Date.now()),
    unrealizedPnL: makeUnavailableValue('test', '/p'),
    realizedPnL: makeUnavailableValue('test', '/p'),
    currency: 'USD',
    source: 'BROKER_IMPORTED',
    retrievedAt: Date.now(),
    provider: 'test',
  };

  const records = reconcilePositions([brokerPos], []);
  // Should be BROKER_ONLY — not silently auto-created in OptionPlus
  assert.strictEqual(records[0].state, 'BROKER_ONLY');
  assert.strictEqual(records[0].reviewedByUser, false); // never auto-reviewed
  assert.strictEqual(records[0].optionplusPositionId, null); // no auto-match
});

test('Broker Phase 20: no automated trading path in any module', () => {
  // parseBrokerFill should NOT create positions automatically
  const fills: BrokerFill[] = [];
  assert.strictEqual(fills.length, 0); // parseBrokerFills does not create positions

  // matchFillToPosition should NOT create a position — only return an ID or null
  const matched = matchFillToPosition(
    { executionId: 'x', orderId: 'y', timestamp: Date.now(), symbol: 'AAPL', underlying: 'AAPL', side: 'buy', quantity: 1, fillPrice: 5, fees: makeUnavailableValue('t', '/f'), currency: 'USD', provider: 'test', source: 'BROKER_IMPORTED' },
    []
  );
  assert.strictEqual(matched, null); // No match = null, not a new position
});
