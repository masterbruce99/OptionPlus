import assert from 'assert';
import test from 'node:test';
import { educationalDictionary } from './educationalEngine.js';

test('Educational Engine Terminology', (t) => {
  t.test('Call Option', () => {
    const call = educationalDictionary['Call'];
    assert.ok(call);
    assert.strictEqual(typeof call.technical, 'string');
    assert.ok(call.technical.includes('right, but not the obligation, to buy'));
    
    if (call.positionSpecific) {
      const positionStr = call.positionSpecific(5);
      assert.ok(positionStr.includes('5 call contracts'));
      assert.ok(positionStr.includes('500 shares'));
    }
  });

  t.test('Delta Option', () => {
    const delta = educationalDictionary['Delta'];
    assert.ok(delta);
    
    if (delta.positionSpecific) {
      const positionStr = delta.positionSpecific(10, 0.50);
      assert.ok(positionStr.includes('$500.00')); // 10 contracts * 100 shares * 0.50 = 500
    }
  });
});
