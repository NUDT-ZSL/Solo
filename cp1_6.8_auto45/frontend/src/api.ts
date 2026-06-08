import type { RoomState } from './types';

const API_BASE = '/api';

export async function fetchRooms(search?: string, category?: string): Promise<RoomState[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  const res = await fetch(`${API_BASE}/rooms?${params}`);
  return res.json();
}

export async function createRoom(name: string, playerName: string, category: string = 'all', maxPlayers: number = 8): Promise<RoomState> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, playerName, category, maxPlayers }),
  });
  return res.json();
}

export async function getRoom(code: string): Promise<RoomState> {
  const res = await fetch(`${API_BASE}/rooms/${code}`);
  return res.json();
}

export async function joinRoom(code: string, playerName: string): Promise<RoomState> {
  const res = await fetch(`${API_BASE}/rooms/${code}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName }),
  });
  return res.json();
}

export async function fetchCategories(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/categories`);
  return res.json();
}
