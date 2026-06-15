import type { BubbleData } from './OceanScene';

const STORAGE_KEY = 'zjfd_collected_poems';

export interface CollectedPoem extends BubbleData {
  collectedAt: number;
}

export function getCollectedPoems(): CollectedPoem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCollectedPoem(data: BubbleData): CollectedPoem {
  const poems = getCollectedPoems();
  const collected: CollectedPoem = {
    ...data,
    collectedAt: Date.now(),
  };
  poems.push(collected);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(poems));
  return collected;
}

export function removeCollectedPoem(id: string): void {
  const poems = getCollectedPoems();
  const filtered = poems.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function isPoemCollected(id: string): boolean {
  const poems = getCollectedPoems();
  return poems.some(p => p.id === id);
}
