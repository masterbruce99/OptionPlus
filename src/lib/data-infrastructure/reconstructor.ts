import { NormalizedHistoricalContract } from './types';

export class HistoricalChainReconstructor {
  
  /**
   * Reconstructs an option chain for a given historical date from a master list of historical contracts.
   * Excludes contracts that were not yet listed or were already delisted.
   */
  static reconstructChainForDate(
    masterContracts: NormalizedHistoricalContract[],
    targetDate: string // YYYY-MM-DD
  ): NormalizedHistoricalContract[] {
    const targetTime = new Date(targetDate).getTime();
    
    return masterContracts.filter(contract => {
      // 1. Exclude if expiration is strictly before targetDate (already expired)
      if (new Date(contract.expiration).getTime() < targetTime) {
        return false;
      }
      
      // 2. Exclude if listing date is known and is strictly after targetDate
      if (contract.listingDate && new Date(contract.listingDate).getTime() > targetTime) {
        return false;
      }
      
      // 3. Exclude if delisting date is known and is strictly before targetDate
      if (contract.delistingDate && new Date(contract.delistingDate).getTime() < targetTime) {
        return false;
      }
      
      return true;
    });
  }
}
