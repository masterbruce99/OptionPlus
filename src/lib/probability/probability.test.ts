import { strict as assert } from 'node:assert';
import { calculateRealizedVolatility } from './realizedVolatility';
import { calculateStraddleExpectedMove, calculateVolatilityExpectedMove } from './expectedMove';
import { calculateProbabilities, calculateOptionProbabilities } from './probabilityEngine';
import { calculateProbabilityOfProfit } from './probabilityOfProfit';
import { buildVolatilityContext } from './volatilityAnalysis';

async function runTests() {
  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void) {
    try {
      fn();
      passed++;
      console.log(`  ✅ ${name}`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${name}`);
      console.error(e);
    }
  }

  console.log('Testing Probability & Volatility Engine');

  console.log('\n▶ Realized Volatility');
  runTest('calculates annualized volatility correctly', () => {
    // 5 days of data, 4 returns
    const prices = [
      { date: '1', close: 100 },
      { date: '2', close: 101 }, // return: ~0.00995
      { date: '3', close: 102 }, // return: ~0.00985
      { date: '4', close: 99 },  // return: ~-0.02985
      { date: '5', close: 100 }  // return: ~0.01005
    ];
    // window is 4 days, so needs 5 prices
    const rv = calculateRealizedVolatility(prices, 4);
    assert.ok(rv !== null);
    assert.ok(rv > 0.1 && rv < 0.4); // rough sanity check
  });

  runTest('returns null when insufficient history', () => {
    const prices = [{ date: '1', close: 100 }, { date: '2', close: 101 }];
    const rv = calculateRealizedVolatility(prices, 10);
    assert.equal(rv, null);
  });

  console.log('\n▶ Expected Move');
  runTest('straddle expected move adds call and put ask', () => {
    const em = calculateStraddleExpectedMove(100, 2.50, 3.00);
    assert.equal(em.value, 5.50);
    assert.equal(em.percentage, 0.055);
    assert.equal(em.impliedRangeLow, 94.50);
    assert.equal(em.impliedRangeHigh, 105.50);
    assert.equal(em.status, 'REAL DATA');
  });

  runTest('volatility expected move calculates 1 stdev correctly', () => {
    // S=100, IV=0.20, DTE=365 -> sqrt(1) * 0.2 * 100 = 20
    const em = calculateVolatilityExpectedMove(100, 0.20, 365);
    assert.equal(Math.round(em.value), 20);
    assert.equal(em.status, 'MODEL ESTIMATE');
  });

  runTest('expected move handles missing/invalid data', () => {
    const em = calculateVolatilityExpectedMove(100, 0, 30);
    assert.equal(em.status, 'INSUFFICIENT DATA');
  });

  console.log('\n▶ Probability Engine (Lognormal / Black-Scholes)');
  runTest('calculates probability above/below correctly (ATM, 0 drift)', () => {
    const params = { S: 100, K: 100, T: 1, r: 0, v: 0.20 };
    // d2 = -0.1, prob above should be around 0.46, prob below around 0.54
    const probs = calculateProbabilities(params);
    assert.equal(probs.status, 'MODEL ESTIMATE');
    assert.ok(probs.probabilityAbove !== null && probs.probabilityAbove > 0.45 && probs.probabilityAbove < 0.47);
    assert.ok(probs.probabilityBelow !== null && probs.probabilityBelow > 0.53 && probs.probabilityBelow < 0.55);
  });

  runTest('ITM probability assigns correctly based on type', () => {
    const params = { S: 100, K: 90, T: 1, r: 0, v: 0.20 };
    const callProb = calculateOptionProbabilities(params, 'call');
    assert.ok(callProb.probabilityITM !== null && callProb.probabilityITM > 0.5); // Deep ITM call

    const putProb = calculateOptionProbabilities(params, 'put');
    assert.ok(putProb.probabilityITM !== null && putProb.probabilityITM < 0.5); // Deep OTM put
  });

  runTest('handles mathematical edge cases gracefully', () => {
    const tZero = calculateProbabilities({ S: 100, K: 100, T: 0, r: 0, v: 0.20 });
    assert.equal(tZero.status, 'INSUFFICIENT DATA');

    const vZero = calculateProbabilities({ S: 100, K: 100, T: 1, r: 0, v: 0 });
    assert.equal(vZero.status, 'INSUFFICIENT DATA');
  });

  console.log('\n▶ Probability of Profit (POP)');
  runTest('long call POP requires price > break-even', () => {
    // S=100, strike 100, paid 5, BE = 105.
    const pop = calculateProbabilityOfProfit({ S: 100, breakEven: 105, T: 1, r: 0, v: 0.20, strategy: 'Long Call' });
    assert.ok(pop.probabilityOfProfit !== null && pop.probabilityOfProfit < 0.5);
  });

  runTest('short put POP requires price > break-even', () => {
    // S=100, strike 100, received 5, BE = 95.
    const pop = calculateProbabilityOfProfit({ S: 100, breakEven: 95, T: 1, r: 0, v: 0.20, strategy: 'Short Put' });
    assert.ok(pop.probabilityOfProfit !== null && pop.probabilityOfProfit > 0.5);
  });

  console.log('\n▶ Volatility Analysis');
  runTest('builds volatility context accurately with sufficient history', () => {
    const prices = Array(21).fill(0).map((_, i) => ({ date: `d${i}`, close: 100 + (i % 2 === 0 ? 1 : -1) }));
    const ivs = [0.15, 0.18, 0.20, 0.25, 0.30];
    
    const ctx = buildVolatilityContext({
      currentIV: 0.20,
      historicalIVs: ivs,
      historicalPrices: prices,
      ivHistoryRequired: 5
    });

    assert.equal(ctx.status, 'REAL DATA');
    assert.equal(ctx.ivRank, (0.20 - 0.15) / (0.30 - 0.15) * 100);
    assert.equal(ctx.ivPercentile, (3 / 5) * 100);
    assert.ok(ctx.realizedVolatility10d !== null);
  });

  runTest('flags INSUFFICIENT DATA when historical IV is missing', () => {
    const ctx = buildVolatilityContext({
      currentIV: 0.20,
      historicalIVs: [0.15, 0.18],
      historicalPrices: [],
      ivHistoryRequired: 5
    });

    assert.equal(ctx.status, 'INSUFFICIENT DATA');
    assert.equal(ctx.ivRank, null);
    assert.equal(ctx.ivPercentile, null);
  });

  console.log('\n================================');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
