import { TradeLeg } from './payoffEngine';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// --- Module 13: Watchlist ---

export interface WatchlistItem {
  id: string;
  type: 'symbol' | 'option' | 'structure' | 'expiration';
  symbol: string;
  description: string;
  addedAt: number;
  metadata?: Record<string, string | number | boolean>;
}

const WATCHLIST_KEY = 'optionplus_watchlist';

export function getWatchlist(): WatchlistItem[] {
  try {
    const data = localStorage.getItem(WATCHLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse watchlist from localStorage', e);
    return [];
  }
}

export function addToWatchlist(item: Omit<WatchlistItem, 'id' | 'addedAt'>): WatchlistItem {
  const watchlist = getWatchlist();
  const newItem: WatchlistItem = {
    ...item,
    id: generateId(),
    addedAt: Date.now(),
  };
  watchlist.push(newItem);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  return newItem;
}

export function removeFromWatchlist(id: string): void {
  const watchlist = getWatchlist().filter(item => item.id !== id);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
}

export function isInWatchlist(symbol: string): boolean {
  return getWatchlist().some(item => item.symbol === symbol);
}

export function clearWatchlist(): void {
  localStorage.removeItem(WATCHLIST_KEY);
}

// --- Module 14: Opportunity Snapshots ---

export interface OpportunitySnapshot {
  id: string;
  timestamp: number;
  underlying: string;
  legs: TradeLeg[];
  marketPrices: Record<string, { bid: number; ask: number; last: number; iv: number }>;
  assumptions: Record<string, string>;
  calculatedEdge: number;
  costAssumptions: Record<string, number>;
  classification: string;
  qualityScore: number;
  liquidityScore: number;
  executionScore: number;
  dataQualityScore: number;
}

const SNAPSHOTS_KEY = 'optionplus_snapshots';

export function getSnapshots(): OpportunitySnapshot[] {
  try {
    const data = localStorage.getItem(SNAPSHOTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse snapshots from localStorage', e);
    return [];
  }
}

export function saveSnapshot(snapshot: Omit<OpportunitySnapshot, 'id' | 'timestamp'>): OpportunitySnapshot {
  const snapshots = getSnapshots();
  const newSnapshot: OpportunitySnapshot = {
    ...snapshot,
    id: generateId(),
    timestamp: Date.now(),
  };
  snapshots.push(newSnapshot);
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  return newSnapshot;
}

export function getSnapshotById(id: string): OpportunitySnapshot | null {
  return getSnapshots().find(s => s.id === id) || null;
}

export function deleteSnapshot(id: string): void {
  const snapshots = getSnapshots().filter(s => s.id !== id);
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

export function clearSnapshots(): void {
  localStorage.removeItem(SNAPSHOTS_KEY);
}

// --- Module 16-17: Trade Journal ---

export type MarketView = 'bullish' | 'bearish' | 'neutral';
export type JournalStatus = 'open' | 'closed';

export interface JournalEntry {
  id: string;
  date: string;
  underlying: string;
  strategy: string;
  direction: MarketView;
  contracts: number;
  entryPrice: number;
  thesis: string;
  expectedOutcome: string;
  expectedMove?: number;
  timeHorizon?: string;
  risk: string;
  exitDate?: string;
  exitPrice?: number;
  realizedPL?: number;
  notes: string;
  status: JournalStatus;
  createdAt: number;
  updatedAt: number;
}

const JOURNAL_KEY = 'optionplus_journal';

export function getJournal(): JournalEntry[] {
  try {
    const data = localStorage.getItem(JOURNAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse journal from localStorage', e);
    return [];
  }
}

export function addJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): JournalEntry {
  const journal = getJournal();
  const now = Date.now();
  const newEntry: JournalEntry = {
    ...entry,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  journal.push(newEntry);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  return newEntry;
}

export function updateJournalEntry(id: string, updates: Partial<JournalEntry>): JournalEntry | null {
  const journal = getJournal();
  const index = journal.findIndex(e => e.id === id);
  if (index === -1) return null;
  
  journal[index] = {
    ...journal[index],
    ...updates,
    updatedAt: Date.now(),
  };
  
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  return journal[index];
}

export function closeJournalEntry(id: string, exitDate: string, exitPrice: number, realizedPL: number, notes?: string): JournalEntry | null {
  const updates: Partial<JournalEntry> = {
    status: 'closed',
    exitDate,
    exitPrice,
    realizedPL,
  };
  if (notes !== undefined) {
    updates.notes = notes;
  }
  return updateJournalEntry(id, updates);
}

export function deleteJournalEntry(id: string): void {
  const journal = getJournal().filter(e => e.id !== id);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
}

export function getOpenTrades(): JournalEntry[] {
  return getJournal().filter(e => e.status === 'open');
}

export function getClosedTrades(): JournalEntry[] {
  return getJournal().filter(e => e.status === 'closed');
}

// --- Module 18: Post-Trade Education ---

export interface PostTradeAnalysis {
  expectedMaxLoss: number;
  actualRealizedPL: number;
  returnOnCapital: number;
  daysHeld: number;
  thesisAccuracy: 'CORRECT_DIRECTION' | 'WRONG_DIRECTION' | 'NEUTRAL_OUTCOME';
  timeDecayRelevant: boolean;
  dataSource: 'USER ENTERED';
}

export function calculatePostTradeAnalysis(entry: JournalEntry): PostTradeAnalysis | null {
  if (entry.status !== 'closed' || entry.realizedPL === undefined || entry.exitDate === undefined) {
    return null;
  }

  const entryDate = new Date(entry.date);
  const exitDate = new Date(entry.exitDate);
  const diffTime = Math.abs(exitDate.getTime() - entryDate.getTime());
  const daysHeld = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let thesisAccuracy: 'CORRECT_DIRECTION' | 'WRONG_DIRECTION' | 'NEUTRAL_OUTCOME' = 'NEUTRAL_OUTCOME';
  if (entry.realizedPL > 0) {
    thesisAccuracy = 'CORRECT_DIRECTION';
  } else if (entry.realizedPL < 0) {
    thesisAccuracy = 'WRONG_DIRECTION';
  }

  let expectedMaxLoss = 0;
  const riskNum = parseFloat(entry.risk.replace(/[^0-9.-]+/g,""));
  if (!isNaN(riskNum)) {
    expectedMaxLoss = riskNum;
  } else {
    expectedMaxLoss = entry.entryPrice * entry.contracts * 100;
  }

  const returnOnCapital = expectedMaxLoss > 0 ? (entry.realizedPL / expectedMaxLoss) * 100 : 0;

  return {
    expectedMaxLoss,
    actualRealizedPL: entry.realizedPL,
    returnOnCapital,
    daysHeld,
    thesisAccuracy,
    timeDecayRelevant: daysHeld > 7,
    dataSource: 'USER ENTERED'
  };
}
