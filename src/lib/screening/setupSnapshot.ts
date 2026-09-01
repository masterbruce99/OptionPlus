import { OptionContract } from '../providers/marketDataProvider';
import { SetupSnapshot } from './types';

const SETUPS_KEY = 'OptionPlus_Setups';

export function getSavedSetups(): SetupSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(SETUPS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveSetup(snapshot: Omit<SetupSnapshot, 'id' | 'timestamp'>): SetupSnapshot {
  const setups = getSavedSetups();
  
  const newSnapshot: SetupSnapshot = {
    ...snapshot,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    timestamp: Date.now()
  };
  
  setups.push(newSnapshot);
  localStorage.setItem(SETUPS_KEY, JSON.stringify(setups));
  return newSnapshot;
}

export function deleteSetup(id: string): void {
  const setups = getSavedSetups();
  const updated = setups.filter(s => s.id !== id);
  localStorage.setItem(SETUPS_KEY, JSON.stringify(updated));
}

export function compareSnapshotToMarket(snapshot: SetupSnapshot, currentChain: OptionContract[]): string[] {
  const changes: string[] = [];
  
  // Example of finding the same leg
  const leg = snapshot.candidate.legs[0];
  const currentContract = currentChain.find(c => c.strike === leg.strike && c.type === leg.type && c.expiration === snapshot.candidate.expiration);

  if (currentContract) {
    if (Math.abs((currentContract.impliedVolatility || 0) - (snapshot.ivAtSnapshot || 0)) > 0.05) {
      changes.push('IV CHANGED');
    }
  }

  if (changes.length === 0) changes.push('NO MAJOR CHANGES');

  return changes;
}
