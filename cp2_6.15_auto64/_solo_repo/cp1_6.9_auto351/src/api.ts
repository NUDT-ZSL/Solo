import type { Trail, TrailInput } from './types';

const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || '请求失败');
  }
  return json as T;
}

export interface GetTrailsResponse {
  success: boolean;
  data: Trail[];
}

export interface AddTrailResponse {
  success: boolean;
  data: Trail;
  updated: boolean;
}

export function fetchTrails(): Promise<GetTrailsResponse> {
  return request<GetTrailsResponse>('/trails', {
    method: 'GET',
  });
}

export function addTrail(data: TrailInput): Promise<AddTrailResponse> {
  return request<AddTrailResponse>('/trails', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteTrail(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/trails/${id}`, {
    method: 'DELETE',
  });
}

export function clearAllTrails(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/trails', {
    method: 'DELETE',
  });
}
