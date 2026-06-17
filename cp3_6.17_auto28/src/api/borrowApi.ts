import type {
  Device,
  DeviceDetail,
  UserDetail,
  BorrowRecord,
  BorrowRecordWithDetails
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `请求失败: ${res.status}`);
  }

  return res.json();
}

export function getDevices(): Promise<Device[]> {
  return request<Device[]>(`${API_BASE}/devices`);
}

export function getDeviceById(id: string): Promise<DeviceDetail> {
  return request<DeviceDetail>(`${API_BASE}/devices/${id}`);
}

export function getUserById(id: string): Promise<UserDetail> {
  return request<UserDetail>(`${API_BASE}/users/${id}`);
}

export function submitBorrow(deviceId: string, userId: string): Promise<BorrowRecord> {
  return request<BorrowRecord>(`${API_BASE}/borrow`, {
    method: 'POST',
    body: JSON.stringify({ deviceId, userId })
  });
}

export function confirmReturn(recordId: string): Promise<{ success: boolean; creditChanged: number }> {
  return request<{ success: boolean; creditChanged: number }>(`${API_BASE}/return`, {
    method: 'POST',
    body: JSON.stringify({ recordId })
  });
}

export function getAllRecords(): Promise<BorrowRecordWithDetails[]> {
  return request<BorrowRecordWithDetails[]>(`${API_BASE}/records`);
}
