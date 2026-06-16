export interface BottleWrite {
  content: string;
  author: string;
  createdAt: string;
}

export interface Bottle {
  id: string;
  title: string;
  content: string;
  color: string;
  author: string;
  mileage: number;
  likes: number;
  writes: BottleWrite[];
  createdAt: string;
  updatedAt: string;
}

const API_BASE = '/api';

export async function fetchBottles(): Promise<Bottle[]> {
  const res = await fetch(`${API_BASE}/bottles`);
  if (!res.ok) throw new Error('Failed to fetch bottles');
  return res.json();
}

export async function createBottle(data: {
  title: string;
  content: string;
  color: string;
  author: string;
}): Promise<Bottle> {
  const res = await fetch(`${API_BASE}/bottles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create bottle');
  return res.json();
}

export async function pickBottle(id: string): Promise<Bottle> {
  const res = await fetch(`${API_BASE}/bottles/${id}/pick`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to pick bottle');
  return res.json();
}

export async function writeBottle(
  id: string,
  data: { content: string; author: string }
): Promise<Bottle> {
  const res = await fetch(`${API_BASE}/bottles/${id}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to write to bottle');
  return res.json();
}

export async function likeBottle(id: string): Promise<Bottle> {
  const res = await fetch(`${API_BASE}/bottles/${id}/like`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to like bottle');
  return res.json();
}
