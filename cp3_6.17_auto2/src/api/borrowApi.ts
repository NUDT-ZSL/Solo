import type {
  Device,
  PaginatedResponse,
  BorrowRecord,
  User,
  BorrowResponse,
  ReturnResponse,
  Stats
} from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export function getDevices(page = 1, limit = 20): Promise<PaginatedResponse<Device>> {
  return request<PaginatedResponse<Device>>(`/devices?page=${page}&limit=${limit}`);
}

export function getDeviceById(id: string): Promise<Device> {
  return request<Device>(`/devices/${id}`);
}

export function getUserById(id: string): Promise<User> {
  return request<User>(`/users/${id}`);
}

export function submitBorrow(deviceId: string, userId: string): Promise<BorrowResponse> {
  return request<BorrowResponse>('/borrow', {
    method: 'POST',
    body: JSON.stringify({ deviceId, userId })
  });
}

export function confirmReturn(recordId: string): Promise<ReturnResponse> {
  return request<ReturnResponse>('/return', {
    method: 'POST',
    body: JSON.stringify({ recordId })
  });
}

export function getRecords(params?: {
  userId?: string;
  deviceId?: string;
  status?: string;
}): Promise<{ data: BorrowRecord[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.userId) query.set('userId', params.userId);
  if (params?.deviceId) query.set('deviceId', params.deviceId);
  if (params?.status) query.set('status', params.status);

  const queryString = query.toString();
  return request(`/records${queryString ? `?${queryString}` : ''}`);
}

export function getStats(): Promise<Stats> {
  return request<Stats>('/stats');
}

export const borrowApi = {
  getDevices,
  getDeviceById,
  getUserById,
  submitBorrow,
  confirmReturn,
  getRecords,
  getStats
};
