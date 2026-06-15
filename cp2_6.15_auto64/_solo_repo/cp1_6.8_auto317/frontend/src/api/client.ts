const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export function fetchDriftBottles(userId: string) {
  return request<any[]>(`/bottles/drift?user_id=${encodeURIComponent(userId)}`);
}

export function fetchHotBottles() {
  return request<any[]>('/bottles/hot');
}

export function createBottle(data: { description: string; emoji: string; category: string; creator_id: string }) {
  return request<any>('/bottles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchBottle(id: string) {
  return request<any>(`/bottles/${id}`);
}

export function createResonance(bottleId: string, data: { description: string; emoji: string; user_id: string }) {
  return request<any>(`/bottles/${bottleId}/resonances`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchResonances(bottleId: string) {
  return request<any[]>(`/bottles/${bottleId}/resonances`);
}

export function passBottle(bottleId: string, userId: string) {
  return request<any>(`/bottles/${bottleId}/pass`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export function fetchUserPublished(userId: string) {
  return request<any[]>(`/users/${encodeURIComponent(userId)}/published`);
}

export function fetchUserResonated(userId: string) {
  return request<any[]>(`/users/${encodeURIComponent(userId)}/resonated`);
}

export function fetchUserStats(userId: string) {
  return request<any>(`/users/${encodeURIComponent(userId)}/stats`);
}

export function createUser(nickname: string) {
  return request<any>('/users', {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  });
}
