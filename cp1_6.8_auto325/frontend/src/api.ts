const API_BASE = "http://localhost:8000/api";

import type { ScentBottle, UserStats } from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  getRandomBottles: (userId: string, count = 5) =>
    request<ScentBottle[]>(`/bottles/random?user_id=${userId}&count=${count}`),

  getHotBottles: () =>
    request<ScentBottle[]>("/bottles/hot"),

  createBottle: (data: { emoji: string; description: string; scent_type: string; author_id: string }) =>
    request<ScentBottle>("/bottles", { method: "POST", body: JSON.stringify(data) }),

  resonateBottle: (bottleId: string, data: { emoji: string; description: string; author_id: string }) =>
    request<ScentBottle>(`/bottles/${bottleId}/resonate`, { method: "POST", body: JSON.stringify(data) }),

  driftBottle: (bottleId: string, authorId: string) =>
    request<{ message: string }>(`/bottles/${bottleId}/drift`, { method: "POST", body: JSON.stringify({ author_id: authorId }) }),

  getUserBottles: (userId: string) =>
    request<ScentBottle[]>(`/users/${userId}/bottles`),

  getUserResonated: (userId: string) =>
    request<ScentBottle[]>(`/users/${userId}/resonated`),

  getUserStats: (userId: string) =>
    request<UserStats>(`/users/${userId}/stats`),

  getScentTypes: () =>
    request<string[]>("/scent-types"),
};
