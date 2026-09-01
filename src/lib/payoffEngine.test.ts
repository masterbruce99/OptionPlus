import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  analyzeStrategy, 
  TradeLeg 
} from './payoffEngine';

describe('Payoff Engine', () => {
  
  it('Long Call Analysis', () => {
    const legs: TradeLeg[] = [
      { id: '1', type: 'call', side: 'long', strike: 150, quantity: 1, entryPrice: 5, multiplier: 100 }
    ];
    
    const analysis = analyzeStrategy(legs, 150);
    assert.ok(analysis);
    assert.strictEqual(analysis.name, "Long Call");
    assert.strictEqual(analysis.maxProfit, null);
    assert.strictEqual(analysis.maxLoss, -500); // 5 * 100
    assert.deepStrictEqual(analysis.breakEvens, [155]);
    assert.strictEqual(analysis.capitalRequired, 500);
    assert.strictEqual(analysis.netDebitCredit, -500);
  });

  it('Long Put Analysis', () => {
    const legs: TradeLeg[] = [
      { id: '1', type: 'put', side: 'long', strike: 150, quantity: 2, entryPrice: 3, multiplier: 100 }
    ];
    
    const analysis = analyzeStrategy(legs, 150);
    assert.ok(analysis);
    assert.strictEqual(analysis.name, "Long Put");
    assert.strictEqual(analysis.maxLoss, -600); // 2 * 3 * 100
    assert.strictEqual(analysis.maxProfit, 29400); // (150 - 3) * 200
    assert.deepStrictEqual(analysis.breakEvens, [147]);
    assert.strictEqual(analysis.netDebitCredit, -600);
  });

  it('Covered Call Analysis', () => {
    const legs: TradeLeg[] = [
      { id: '1', type: 'stock', side: 'long', strike: 0, quantity: 1, entryPrice: 145, multiplier: 100 },
      { id: '2', type: 'call', side: 'short', strike: 150, quantity: 1, entryPrice: 2, multiplier: 100 }
    ];
    
    const analysis = analyzeStrategy(legs, 145);
    assert.ok(analysis);
    assert.strictEqual(analysis.name, "Covered Call");
    assert.strictEqual(analysis.maxProfit, 700); // (150-145)*100 + 200
    assert.strictEqual(analysis.maxLoss, -14300); // -14500 + 200
    assert.deepStrictEqual(analysis.breakEvens, [143]);
    assert.strictEqual(analysis.capitalRequired, 14500);
    assert.strictEqual(analysis.netDebitCredit, -14300); // 200 - 14500
  });

  it('Cash-Secured Put Analysis', () => {
    const legs: TradeLeg[] = [
      { id: '1', type: 'put', side: 'short', strike: 150, quantity: 1, entryPrice: 4, multiplier: 100 }
    ];
    
    const analysis = analyzeStrategy(legs, 155);
    assert.ok(analysis);
    assert.strictEqual(analysis.name, "Cash-Secured Put");
    assert.strictEqual(analysis.maxProfit, 400); 
    assert.strictEqual(analysis.maxLoss, -14600); // -15000 + 400
    assert.deepStrictEqual(analysis.breakEvens, [146]);
    assert.strictEqual(analysis.capitalRequired, 15000);
    assert.strictEqual(analysis.netDebitCredit, 400); 
  });

  it('Bull Call Spread Analysis (Debit)', () => {
    const legs: TradeLeg[] = [
      { id: '1', type: 'call', side: 'long', strike: 150, quantity: 1, entryPrice: 5, multiplier: 100 },
      { id: '2', type: 'call', side: 'short', strike: 155, quantity: 1, entryPrice: 2, multiplier: 100 }
    ];
    
    const analysis = analyzeStrategy(legs, 150);
    assert.ok(analysis);
    assert.strictEqual(analysis.name, "Bull Call Spread");
    assert.strictEqual(analysis.netDebitCredit, -300); // 200 - 500
    assert.strictEqual(analysis.maxLoss, -300); 
    assert.strictEqual(analysis.maxProfit, 200); // 500 spread - 300 debit
    assert.deepStrictEqual(analysis.breakEvens, [153]); 
    assert.strictEqual(analysis.capitalRequired, 300);
  });

  it('Bear Call Spread Analysis (Credit)', () => {
    const legs: TradeLeg[] = [
      { id: '1', type: 'call', side: 'short', strike: 150, quantity: 1, entryPrice: 5, multiplier: 100 },
      { id: '2', type: 'call', side: 'long', strike: 155, quantity: 1, entryPrice: 2, multiplier: 100 }
    ];
    
    const analysis = analyzeStrategy(legs, 150);
    assert.ok(analysis);
    assert.strictEqual(analysis.name, "Bear Call Spread");
    assert.strictEqual(analysis.netDebitCredit, 300); // 500 - 200
    assert.strictEqual(analysis.maxProfit, 300); 
    assert.strictEqual(analysis.maxLoss, -200); // 300 credit - 500 spread
    assert.deepStrictEqual(analysis.breakEvens, [153]); 
    assert.strictEqual(analysis.capitalRequired, 500); // spread width margin
  });

  it('Bull Put Spread Analysis (Credit)', () => {
    const legs: TradeLeg[] = [
      { id: '1', type: 'put', side: 'short', strike: 155, quantity: 1, entryPrice: 5, multiplier: 100 },
      { id: '2', type: 'put', side: 'long', strike: 150, quantity: 1, entryPrice: 2, multiplier: 100 }
    ];
    
    const analysis = analyzeStrategy(legs, 150);
    assert.ok(analysis);
    assert.strictEqual(analysis.name, "Bull Put Spread");
    assert.strictEqual(analysis.netDebitCredit, 300); // 500 - 200
    assert.strictEqual(analysis.maxProfit, 300); 
    assert.strictEqual(analysis.maxLoss, -200); // 300 credit - 500 spread
    assert.deepStrictEqual(analysis.breakEvens, [152]); 
    assert.strictEqual(analysis.capitalRequired, 500); // spread width margin
  });

  it('Bear Put Spread Analysis (Debit)', () => {
    const legs: TradeLeg[] = [
      { id: '1', type: 'put', side: 'long', strike: 155, quantity: 1, entryPrice: 5, multiplier: 100 },
      { id: '2', type: 'put', side: 'short', strike: 150, quantity: 1, entryPrice: 2, multiplier: 100 }
    ];
    
    const analysis = analyzeStrategy(legs, 150);
    assert.ok(analysis);
    assert.strictEqual(analysis.name, "Bear Put Spread");
    assert.strictEqual(analysis.netDebitCredit, -300); 
    assert.strictEqual(analysis.maxProfit, 200); 
    assert.strictEqual(analysis.maxLoss, -300);
    assert.deepStrictEqual(analysis.breakEvens, [152]); 
    assert.strictEqual(analysis.capitalRequired, 300); 
  });
});
