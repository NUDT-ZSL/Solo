import type { BottleData, Emotion } from './BottleData';

const API_BASE = 'http://localhost:8000/api';

export async function fetchBottles(): Promise<BottleData[]> {
  try {
    const res = await fetch(`${API_BASE}/bottles`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createBottle(emotion: Emotion, content: string): Promise<BottleData | null> {
  try {
    const res = await fetch(`${API_BASE}/bottles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotion, content }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function addReaction(bottleId: string, type: 'like' | 'comfort' | 'sigh'): Promise<BottleData['reactions'] | null> {
  try {
    const res = await fetch(`${API_BASE}/bottles/${bottleId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
