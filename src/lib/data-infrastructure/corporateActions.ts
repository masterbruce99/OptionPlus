export type CorporateActionType = 'SPLIT' | 'REVERSE_SPLIT' | 'SPECIAL_DIVIDEND' | 'SYMBOL_CHANGE' | 'MERGER';

export interface CorporateAction {
  id: string;
  type: CorporateActionType;
  date: string; // Ex-date or effective date
  symbol: string;
  ratio?: number; // e.g. 2 for 2-for-1 split, 0.5 for reverse split
  oldSymbol?: string;
  newSymbol?: string;
  description: string;
}

export class CorporateActionManager {
  /**
   * Applies corporate actions to adjust historical prices and strike prices.
   * Note: Some premium providers adjust historical data for you. 
   * This module is built to track and apply adjustments if raw data is provided.
   */
  static adjustForSplit(value: number, ratio: number, isPrice: boolean = true): number {
    if (ratio <= 0) return value;
    // For a 2:1 split (ratio=2), historical prices should be divided by 2 to align with current price.
    // However, some historical data might be adjusted differently.
    return isPrice ? value / ratio : value * ratio;
  }
}
