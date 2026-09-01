import { NormalizedHistoricalQuote, NormalizedHistoricalContract, DataQualityReport } from './types';

export class DataValidationEngine {
  
  /**
   * Validates a historical quote observation.
   * Returns true if valid, false if invalid.
   */
  static isValidQuote(quote: NormalizedHistoricalQuote): boolean {
    // Missing required identifiers (we assume timestamp is mandatory)
    if (!quote.timestamp) return false;
    
    // Future observation check
    if (quote.timestamp > Date.now()) return false;
    
    // Negative prices
    if (quote.bid !== null && quote.bid < 0) return false;
    if (quote.ask !== null && quote.ask < 0) return false;
    if (quote.last !== null && quote.last < 0) return false;
    
    // Impossible spreads
    if (quote.bid !== null && quote.ask !== null && quote.ask < quote.bid) return false;
    
    return true;
  }
  
  /**
   * Validates a historical contract structure.
   */
  static isValidContract(contract: NormalizedHistoricalContract): boolean {
    if (!contract.underlying || !contract.symbol) return false;
    
    // Invalid multiplier
    if (contract.multiplier <= 0) return false;
    
    // Negative strike
    if (contract.strike < 0) return false;
    
    // Invalid dates (e.g., expiration before listing date)
    if (contract.listingDate && new Date(contract.expiration).getTime() < new Date(contract.listingDate).getTime()) {
      return false;
    }
    
    return true;
  }

  /**
   * Processes an array of quotes, removing duplicates and invalid observations,
   * while building a quality report.
   */
  static processQuotes(quotes: NormalizedHistoricalQuote[], source: string, startDate: string, endDate: string): { validQuotes: NormalizedHistoricalQuote[], report: DataQualityReport } {
    let missingDataCount = 0;
    let duplicateCount = 0;
    let invalidObservationCount = 0;
    
    let bidAskValidCount = 0;
    let ivValidCount = 0;
    let greekValidCount = 0;
    let openInterestValidCount = 0;
    
    const validQuotes: NormalizedHistoricalQuote[] = [];
    const seenTimestamps = new Set<number>();
    
    for (const quote of quotes) {
      if (!this.isValidQuote(quote)) {
        invalidObservationCount++;
        continue;
      }
      
      if (seenTimestamps.has(quote.timestamp)) {
        duplicateCount++;
        continue;
      }
      
      seenTimestamps.add(quote.timestamp);
      validQuotes.push(quote);
      
      let isMissingCore = false;
      
      if (quote.bid !== null && quote.ask !== null) {
        bidAskValidCount++;
      } else {
        isMissingCore = true;
      }
      
      if (quote.iv !== null) ivValidCount++;
      if (quote.delta !== null && quote.gamma !== null) greekValidCount++;
      if (quote.openInterest !== null) openInterestValidCount++;
      
      if (isMissingCore) {
        missingDataCount++;
      }
    }
    
    const total = quotes.length;
    
    const report: DataQualityReport = {
      source,
      dateRange: { start: startDate, end: endDate },
      underlyingCoverage: 1.0, // Assuming provided appropriately
      optionContractCoverage: 1.0,
      quoteCoverage: total > 0 ? validQuotes.length / total : 0,
      bidAskCoverage: total > 0 ? bidAskValidCount / total : 0,
      ivCoverage: total > 0 ? ivValidCount / total : 0,
      greekCoverage: total > 0 ? greekValidCount / total : 0,
      openInterestCoverage: total > 0 ? openInterestValidCount / total : 0,
      missingDataCount,
      duplicateCount,
      invalidObservationCount
    };
    
    return { validQuotes, report };
  }
}
