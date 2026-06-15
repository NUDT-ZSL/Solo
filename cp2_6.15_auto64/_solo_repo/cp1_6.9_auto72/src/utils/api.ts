import { ClimateData, TreeRecord, ApiResponse } from '../types';

const base = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: '网络错误' };
  }
}

export const api = {
  getAllTrees: () => request<TreeRecord[]>(`${base}/trees`),
  getTree: (date: string) => request<TreeRecord>(`${base}/trees/${date}`),
  createTree: (climate: ClimateData) =>
    request<TreeRecord>(`${base}/trees`, {
      method: 'POST',
      body: JSON.stringify({ climate }),
    }),
  updateTree: (date: string, climate: ClimateData) =>
    request<TreeRecord>(`${base}/trees/${date}`, {
      method: 'PUT',
      body: JSON.stringify({ climate }),
    }),
  deleteTree: (date: string) =>
    request<void>(`${base}/trees/${date}`, { method: 'DELETE' }),
  getToday: () => request<{ date: string; exists: boolean }>(`${base}/today`),
};
