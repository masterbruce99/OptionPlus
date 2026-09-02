import { TradeLeg } from './payoffEngine';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// --- Module 13: Watchlist ---

export interface WatchlistItem {
  id: string;
  type: 'symbol' | 'option' | 'structure' | 'expiration' | 'event';
  symbol: string;
  description: string;
  addedAt: number;
  metadata?: Record<string, string | number | boolean>;
}

const WATCHLIST_KEY = 'optionplus_watchlist';

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
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
  if (typeof window !== 'undefined') localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  return newItem;
}

export function removeFromWatchlist(id: string): void {
  const watchlist = getWatchlist().filter(item => item.id !== id);
  if (typeof window !== 'undefined') localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
}

export function isInWatchlist(symbol: string): boolean {
  return getWatchlist().some(item => item.symbol === symbol);
}

export function clearWatchlist(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(WATCHLIST_KEY);
}

// --- Generic Storage Helpers ---

function getStorageItems<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage`, e);
    return [];
  }
}

function saveStorageItem<T extends { id: string; timestamp?: number }>(
  key: string,
  item: Omit<T, 'id' | 'timestamp'>
): T {
  const items = getStorageItems<T>(key);
  const newItem = {
    ...item,
    id: generateId(),
    timestamp: Date.now(),
  } as unknown as T;
  items.push(newItem);
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(items));
  return newItem;
}

function deleteStorageItem<T extends { id: string }>(key: string, id: string): void {
  const items = getStorageItems<T>(key).filter(item => item.id !== id);
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(items));
}

function clearStorageKey(key: string): void {
  if (typeof window !== 'undefined') localStorage.removeItem(key);
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
  return getStorageItems<OpportunitySnapshot>(SNAPSHOTS_KEY);
}

export function saveSnapshot(snapshot: Omit<OpportunitySnapshot, 'id' | 'timestamp'>): OpportunitySnapshot {
  return saveStorageItem<OpportunitySnapshot>(SNAPSHOTS_KEY, snapshot);
}

export function getSnapshotById(id: string): OpportunitySnapshot | null {
  return getSnapshots().find(s => s.id === id) || null;
}

export function deleteSnapshot(id: string): void {
  deleteStorageItem<OpportunitySnapshot>(SNAPSHOTS_KEY, id);
}

export function clearSnapshots(): void {
  clearStorageKey(SNAPSHOTS_KEY);
}

// --- Module 36, 37: Event Snapshots (Phase 15) ---

export interface EventSnapshot {
  id: string;
  timestamp: number;
  eventId: string;
  eventDate: string | null;
  marketPrices: Record<string, { bid: number; ask: number; last: number; iv: number }>;
  expectedMove?: number;
  portfolioExposure?: unknown;
  activity?: unknown;
}

const EVENT_SNAPSHOTS_KEY = 'optionplus_event_snapshots';

export function getEventSnapshots(): EventSnapshot[] {
  return getStorageItems<EventSnapshot>(EVENT_SNAPSHOTS_KEY);
}

export function saveEventSnapshot(snapshot: Omit<EventSnapshot, 'id' | 'timestamp'>): EventSnapshot {
  return saveStorageItem<EventSnapshot>(EVENT_SNAPSHOTS_KEY, snapshot);
}

export function getEventSnapshotById(id: string): EventSnapshot | null {
  return getEventSnapshots().find(s => s.id === id) || null;
}

export function deleteEventSnapshot(id: string): void {
  deleteStorageItem<EventSnapshot>(EVENT_SNAPSHOTS_KEY, id);
}

export function clearEventSnapshots(): void {
  clearStorageKey(EVENT_SNAPSHOTS_KEY);
}

// --- Module 16-17: Advanced Trade Journal (Phase 13) ---

export type MarketViewDirection = 'bullish' | 'bearish' | 'neutral';
export type VolatilityView = 'increasing' | 'decreasing' | 'neutral';
export type JournalStatus = 'idea' | 'open' | 'closed';

export interface TradeLegSnapshot {
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  action: 'buy' | 'sell';
  price: number;
  iv?: number;
  delta?: number;
}

export interface MarketEvidence {
  underlyingPriceAtEntry: number;
  impliedVolatilityAtEntry?: number;
  ivRankAtEntry?: number;
  notes: string;
}

export interface PreTradeChecklist {
  thesisMatchesMarket: boolean;
  riskDefined: boolean;
  capitalEfficient: boolean;
  liquidityChecked: boolean;
  earningsChecked: boolean;
}

export interface TradePostMortem {
  exitDate: string;
  exitPrice: number;
  underlyingPriceAtExit: number;
  realizedPL: number;
  daysHeld: number;
  expectedVsActualMove: {
    expected: number;
    actual: number;
  };
  thesisAccuracy: 'CORRECT' | 'PARTIALLY_CORRECT' | 'WRONG';
  primaryPLDriver: 'DELTA' | 'VEGA' | 'THETA' | 'MULTI' | 'UNKNOWN';
  mistakeClassification?: 'FOMO' | 'SIZING' | 'FORCED_TRADE' | 'IGNORED_RULE' | 'NONE';
  tradeReview: string;
}

export interface AdvancedJournalEntry {
  id: string;
  date: string; // Entry Date
  underlying: string;
  strategy: string;

  // Thesis (Module 2)
  direction: MarketViewDirection;
  volatilityView: VolatilityView;
  thesis: string;
  expectedOutcome: string;

  // Market Evidence (Module 3)
  marketEvidence: MarketEvidence;

  // Pre-Trade (Modules 6-9)
  checklist: PreTradeChecklist;
  whatMustHappen: string;
  whatCanGoWrong: string;
  invalidationRule: string;

  // Entry Record (Module 10)
  contracts: number;
  entryPrice: number;
  legs: TradeLegSnapshot[];
  risk: string;

  // Post-Mortem (Modules 11-18)
  postMortem?: TradePostMortem;

  // Event Context (Phase 15, Module 38)
  eventId?: string;
  eventThesis?: string;
  eventExposure?: unknown;

  status: JournalStatus;
  createdAt: number;
  updatedAt: number;
}

// Use a new key to avoid conflicts with Phase 5 mock data
const JOURNAL_KEY = 'optionplus_learning_journal';

export function getJournal(): AdvancedJournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(JOURNAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse journal from localStorage', e);
    return [];
  }
}

export function addJournalEntry(entry: Omit<AdvancedJournalEntry, 'id' | 'createdAt' | 'updatedAt'>): AdvancedJournalEntry {
  const journal = getJournal();
  const now = Date.now();
  const newEntry: AdvancedJournalEntry = {
    ...entry,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  journal.push(newEntry);
  if (typeof window !== 'undefined') localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  return newEntry;
}

export function updateJournalEntry(id: string, updates: Partial<AdvancedJournalEntry>): AdvancedJournalEntry | null {
  const journal = getJournal();
  const index = journal.findIndex(e => e.id === id);
  if (index === -1) return null;
  
  journal[index] = {
    ...journal[index],
    ...updates,
    updatedAt: Date.now(),
  };
  
  if (typeof window !== 'undefined') localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  return journal[index];
}

export function deleteJournalEntry(id: string): void {
  const journal = getJournal().filter(e => e.id !== id);
  if (typeof window !== 'undefined') localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
}

export function getTradesByStatus(status: JournalStatus): AdvancedJournalEntry[] {
  return getJournal().filter(e => e.status === status);
}
