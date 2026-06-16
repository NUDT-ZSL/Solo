import type { GameListItem, GameDetail, SubmitRatingPayload, SubmitRatingResponse, Tag } from './types';

const API_BASE = 'http://localhost:3005/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchGames(): Promise<GameListItem[]> {
  return request<GameListItem[]>(`${API_BASE}/games`);
}

export async function fetchGameDetail(id: string): Promise<GameDetail> {
  return request<GameDetail>(`${API_BASE}/games/${id}`);
}

export async function fetchTags(): Promise<Tag[]> {
  return request<Tag[]>(`${API_BASE}/tags`);
}

export async function submitRating(payload: SubmitRatingPayload): Promise<SubmitRatingResponse> {
  return request<SubmitRatingResponse>(`${API_BASE}/ratings`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
