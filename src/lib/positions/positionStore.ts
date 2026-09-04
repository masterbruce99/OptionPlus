import { LivePosition } from './types';

const LIVE_POSITIONS_KEY = 'optionplus_live_positions';

export function getLivePositions(): LivePosition[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LIVE_POSITIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to parse live positions from localStorage', error);
    return [];
  }
}

export function saveLivePosition(position: Omit<LivePosition, 'id'>): LivePosition {
  const positions = getLivePositions();
  const newPosition: LivePosition = {
    ...position,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  };
  
  positions.push(newPosition);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(LIVE_POSITIONS_KEY, JSON.stringify(positions));
  }
  
  return newPosition;
}

export function updateLivePosition(id: string, updates: Partial<LivePosition>): LivePosition | null {
  const positions = getLivePositions();
  const index = positions.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  positions[index] = { ...positions[index], ...updates };
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(LIVE_POSITIONS_KEY, JSON.stringify(positions));
  }
  
  return positions[index];
}

export function getLivePositionById(id: string): LivePosition | null {
  const positions = getLivePositions();
  return positions.find(p => p.id === id) || null;
}

export function deleteLivePosition(id: string): void {
  const positions = getLivePositions().filter(p => p.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(LIVE_POSITIONS_KEY, JSON.stringify(positions));
  }
}

export function clearLivePositions(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LIVE_POSITIONS_KEY);
  }
}
