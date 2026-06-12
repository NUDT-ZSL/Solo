import type { Card, Enemy, PlayerState, ChestReward } from './types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getAllCards(playerLevel?: number): Promise<Card[]> {
  const qs = playerLevel !== undefined ? `?playerLevel=${playerLevel}` : '';
  return request<Card[]>(`/cards${qs}`);
}

export async function getRandomCards(count = 4, playerLevel = 1): Promise<Card[]> {
  return request<Card[]>(
    `/cards/random?count=${count}&playerLevel=${playerLevel}`
  );
}

export async function getEnemies(level?: number): Promise<Enemy[]> {
  const qs = level !== undefined ? `?level=${level}` : '';
  return request<Enemy[]>(`/enemies${qs}`);
}

export async function getRandomEnemies(level = 1, count = 3): Promise<Enemy[]> {
  return request<Enemy[]>(
    `/enemies/random?level=${level}&count=${count}`
  );
}

export async function getOrCreatePlayer(): Promise<PlayerState> {
  return request<PlayerState>('/player', { method: 'POST' });
}

export async function updatePlayer(data: Partial<PlayerState>): Promise<PlayerState> {
  return request<PlayerState>('/player', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function resetPlayer(): Promise<{ message: string }> {
  return request<{ message: string }>('/player', { method: 'DELETE' });
}

export async function completeBattle(
  victory: boolean,
  goldEarned: number,
  cardReward: Card | null,
  hpChange: number
): Promise<{ player: PlayerState; victory: boolean }> {
  return request('/battle/complete', {
    method: 'POST',
    body: JSON.stringify({ victory, goldEarned, cardReward, hpChange }),
  });
}

export async function openChest(): Promise<ChestReward> {
  return request<ChestReward>('/chest/open');
}

export function getRarityColor(rarity: Card['rarity']): string {
  switch (rarity) {
    case 'rare':
      return '#3b82f6';
    case 'epic':
      return '#f59e0b';
    default:
      return '#ffffff';
  }
}

export function getRarityLabel(rarity: Card['rarity']): string {
  switch (rarity) {
    case 'rare':
      return '稀有';
    case 'epic':
      return '史诗';
    default:
      return '普通';
  }
}

export function getTypeIcon(type: Card['type']): string {
  switch (type) {
    case 'attack':
      return '⚔';
    case 'defense':
      return '🛡';
    case 'heal':
      return '✚';
  }
}
