import assert from 'assert';
import test from 'node:test';
import {
  calculateMidPrice,
  calculateSpread,
  calculateSpreadPercentage,
  calculateIntrinsicValue,
  calculateExtrinsicValue,
  calculateBreakEven,
  categorizeDTE,
  assessLiquidity,
  getTradeDirection
} from './calculations.js';

test('Calculations Engine', (t) => {
  t.test('Mid Price', () => {
    assert.strictEqual(calculateMidPrice(2.40, 2.50), 2.45);
    assert.strictEqual(calculateMidPrice(null, 2.50), null);
    assert.strictEqual(calculateMidPrice(0, 0), null);
  });

  t.test('Spread', () => {
    assert.strictEqual(calculateSpread(2.40, 2.50), 0.10000000000000009); // JS float math
    assert.strictEqual(calculateSpread(null, 2.50), null);
  });

  t.test('Spread Percentage', () => {
    const pct = calculateSpreadPercentage(2.40, 2.50);
    assert.ok(pct! > 0.04 && pct! < 0.05); // ~4.08%
    assert.strictEqual(calculateSpreadPercentage(0, 0), null);
  });

  t.test('Intrinsic Value - Call', () => {
    assert.strictEqual(calculateIntrinsicValue('call', 100, 110), 10);
    assert.strictEqual(calculateIntrinsicValue('call', 100, 90), 0);
  });

  t.test('Intrinsic Value - Put', () => {
    assert.strictEqual(calculateIntrinsicValue('put', 100, 90), 10);
    assert.strictEqual(calculateIntrinsicValue('put', 100, 110), 0);
  });

  t.test('Extrinsic Value', () => {
    assert.strictEqual(calculateExtrinsicValue(15, 10), 5); // ITM
    assert.strictEqual(calculateExtrinsicValue(5, 0), 5); // OTM
  });

  t.test('Break Even - Call', () => {
    assert.strictEqual(calculateBreakEven('call', 100, 5), 105);
  });

  t.test('Break Even - Put', () => {
    assert.strictEqual(calculateBreakEven('put', 100, 5), 95);
  });

  t.test('Categorize DTE', () => {
    assert.strictEqual(categorizeDTE(5), 'Very Short');
    assert.strictEqual(categorizeDTE(15), 'Short');
    assert.strictEqual(categorizeDTE(45), 'Medium');
    assert.strictEqual(categorizeDTE(120), 'Long');
    assert.strictEqual(categorizeDTE(null), 'Unknown');
  });

  t.test('Assess Liquidity', () => {
    assert.strictEqual(assessLiquidity(2000, 6000, 0.02), 'High');
    assert.strictEqual(assessLiquidity(500, 1000, 0.05), 'Medium');
    assert.strictEqual(assessLiquidity(5, 10, 0.20), 'Low');
  });
  
  t.test('Trade Direction', () => {
    assert.strictEqual(getTradeDirection('call'), 'Bullish');
    assert.strictEqual(getTradeDirection('put'), 'Bearish');
  });
});
