import type { Device, User, BorrowRecordWithInfo, BorrowRecord } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '请求失败');
  }
  
  return response.json();
}

export async function getDevices(): Promise<Device[]> {
  return request<Device[]>('/devices');
}

export async function getDevice(id: string): Promise<Device> {
  return request<Device>(`/devices/${id}`);
}

export async function getUser(id: string): Promise<User> {
  return request<User>(`/users/${id}`);
}

export async function submitBorrow(deviceId: string, userId: string): Promise<{
  success: boolean;
  record: BorrowRecord;
  device: Device;
}> {
  return request('/borrow', {
    method: 'POST',
    body: JSON.stringify({ deviceId, userId }),
  });
}

export async function confirmReturn(recordId: string): Promise<{
  success: boolean;
  record: BorrowRecord;
  creditScore: number;
}> {
  return request('/return', {
    method: 'POST',
    body: JSON.stringify({ recordId }),
  });
}

export async function getAllRecords(): Promise<BorrowRecordWithInfo[]> {
  return request<BorrowRecordWithInfo[]>('/records');
}
