import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { DataValidationEngine } from './validation';
import { NormalizedHistoricalQuote, NormalizedHistoricalContract } from './types';
import { DefaultHistoricalProvider } from './provider';
import { HistoricalChainReconstructor } from './reconstructor';

describe('Phase 7: Data Infrastructure', () => {

  describe('Module 2 & 3: Provider Abstraction & Capabilities', () => {
    it('returns NOT_SUPPORTED for all capabilities in DefaultHistoricalProvider', () => {
      const provider = new DefaultHistoricalProvider();
      const caps = provider.getCapabilities();
      assert.strictEqual(caps.underlyingHistory, 'NOT_SUPPORTED');
      assert.strictEqual(caps.optionContracts, 'NOT_SUPPORTED');
    });

    it('returns UNAVAILABLE status gracefully when fetching data from Default provider', async () => {
      const provider = new DefaultHistoricalProvider();
      const res = await provider.getHistoricalOptionContracts('AAPL', '2023-01-01');
      assert.strictEqual(res.status, 'UNAVAILABLE');
    });
  });

  describe('Module 7: Data Validation Engine', () => {
    it('detects negative prices as invalid', () => {
      const quote: NormalizedHistoricalQuote = {
        timestamp: Date.now() - 1000,
        bid: -0.05,
        ask: 0.10,
        last: null,
        bidSize: null,
        askSize: null,
        volume: null,
        openInterest: null,
        iv: null,
        delta: null,
        gamma: null,
        theta: null,
        vega: null,
        rho: null,
        source: 'test'
      };
      assert.strictEqual(DataValidationEngine.isValidQuote(quote), false);
    });

    it('detects ask < bid as invalid', () => {
      const quote: NormalizedHistoricalQuote = {
        timestamp: Date.now() - 1000,
        bid: 0.20,
        ask: 0.10,
        last: null,
        bidSize: null,
        askSize: null,
        volume: null,
        openInterest: null,
        iv: null,
        delta: null,
        gamma: null,
        theta: null,
        vega: null,
        rho: null,
        source: 'test'
      };
      assert.strictEqual(DataValidationEngine.isValidQuote(quote), false);
    });

    it('detects duplicate timestamps', () => {
      const quote1: NormalizedHistoricalQuote = {
        timestamp: 1600000000000,
        bid: 0.10, ask: 0.20, last: null, bidSize: null, askSize: null, volume: null, openInterest: null, iv: null, delta: null, gamma: null, theta: null, vega: null, rho: null, source: 'test'
      };
      const quote2 = { ...quote1 };

      const { validQuotes, report } = DataValidationEngine.processQuotes([quote1, quote2], 'test', 'start', 'end');
      assert.strictEqual(validQuotes.length, 1);
      assert.strictEqual(report.duplicateCount, 1);
    });
  });

  describe('Module 17: Historical Chain Reconstruction', () => {
    const masterContracts: NormalizedHistoricalContract[] = [
      {
        underlying: 'AAPL',
        symbol: 'AAPL_230120C150',
        type: 'call',
        strike: 150,
        expiration: '2023-01-20',
        multiplier: 100,
        listingDate: '2021-01-01',
        delistingDate: null,
        timestamp: 0,
        source: 'test'
      },
      {
        underlying: 'AAPL',
        symbol: 'AAPL_220121C150',
        type: 'call',
        strike: 150,
        expiration: '2022-01-21',
        multiplier: 100,
        listingDate: '2020-01-01',
        delistingDate: '2022-01-22',
        timestamp: 0,
        source: 'test'
      }
    ];

    it('excludes contracts not yet listed', () => {
      const reconstructed = HistoricalChainReconstructor.reconstructChainForDate(masterContracts, '2020-06-01');
      assert.strictEqual(reconstructed.length, 1);
      assert.strictEqual(reconstructed[0].symbol, 'AAPL_220121C150');
    });

    it('excludes contracts already expired', () => {
      const reconstructed = HistoricalChainReconstructor.reconstructChainForDate(masterContracts, '2022-06-01');
      assert.strictEqual(reconstructed.length, 1);
      assert.strictEqual(reconstructed[0].symbol, 'AAPL_230120C150');
    });
  });
});
