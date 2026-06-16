import type { CoffeeBean, RoastBatch, StatsData, CreateBatchRequest } from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const apiClient = {
  getBeans: (): Promise<CoffeeBean[]> =>
    fetchJson<CoffeeBean[]>(`${API_BASE}/beans`),

  getBatches: (): Promise<RoastBatch[]> =>
    fetchJson<RoastBatch[]>(`${API_BASE}/batches`),

  createBatch: (data: CreateBatchRequest): Promise<RoastBatch> =>
    fetchJson<RoastBatch>(`${API_BASE}/batches`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStats: (): Promise<StatsData> =>
    fetchJson<StatsData>(`${API_BASE}/stats`),
};
