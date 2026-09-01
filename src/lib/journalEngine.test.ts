import { 
  calculateThesisAccuracy, 
  calculateWinRate 
} from './journalEngine';
import { AdvancedJournalEntry } from './store';

describe('journalEngine', () => {
  const baseEntry: AdvancedJournalEntry = {
    id: 'test',
    date: '2023-01-01',
    underlying: 'AAPL',
    strategy: 'Long Call',
    direction: 'bullish',
    volatilityView: 'neutral',
    thesis: 'test',
    expectedOutcome: 'test',
    marketEvidence: {
      underlyingPriceAtEntry: 150,
      notes: ''
    },
    checklist: {
      thesisMatchesMarket: true,
      riskDefined: true,
      capitalEfficient: true,
      liquidityChecked: true,
      earningsChecked: true
    },
    whatMustHappen: 'test',
    whatCanGoWrong: 'test',
    invalidationRule: 'test',
    contracts: 1,
    entryPrice: 1.0,
    legs: [],
    risk: '$100',
    status: 'closed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('calculates thesis accuracy correctly', () => {
    const entry: AdvancedJournalEntry = {
      ...baseEntry,
      postMortem: {
        exitDate: '2023-01-05',
        exitPrice: 2.0,
        underlyingPriceAtExit: 155,
        realizedPL: 100,
        daysHeld: 4,
        expectedVsActualMove: { expected: 10, actual: 5 },
        thesisAccuracy: 'WRONG',
        primaryPLDriver: 'UNKNOWN',
        tradeReview: ''
      }
    };

    expect(calculateThesisAccuracy(entry)).toBe('CORRECT');
  });

  it('determines partially correct thesis', () => {
    const entry: AdvancedJournalEntry = {
      ...baseEntry,
      direction: 'bearish',
      postMortem: {
        exitDate: '2023-01-05',
        exitPrice: 2.0,
        underlyingPriceAtExit: 155,
        realizedPL: 100,
        daysHeld: 4,
        expectedVsActualMove: { expected: -10, actual: 5 }, // Stock went UP, but P/L is positive (maybe IV spiked)
        thesisAccuracy: 'WRONG',
        primaryPLDriver: 'UNKNOWN',
        tradeReview: ''
      }
    };

    expect(calculateThesisAccuracy(entry)).toBe('PARTIALLY_CORRECT');
  });

  it('calculates win rate', () => {
    const winningEntry: AdvancedJournalEntry = {
      ...baseEntry,
      postMortem: {
        exitDate: '2023-01-05',
        exitPrice: 2.0,
        underlyingPriceAtExit: 155,
        realizedPL: 100,
        daysHeld: 4,
        expectedVsActualMove: { expected: 10, actual: 5 },
        thesisAccuracy: 'CORRECT',
        primaryPLDriver: 'UNKNOWN',
        tradeReview: ''
      }
    };

    const losingEntry: AdvancedJournalEntry = {
      ...baseEntry,
      postMortem: {
        exitDate: '2023-01-05',
        exitPrice: 0.5,
        underlyingPriceAtExit: 145,
        realizedPL: -50,
        daysHeld: 4,
        expectedVsActualMove: { expected: 10, actual: -5 },
        thesisAccuracy: 'WRONG',
        primaryPLDriver: 'UNKNOWN',
        tradeReview: ''
      }
    };

    expect(calculateWinRate([winningEntry, losingEntry])).toBe(50);
  });
});
