import { Device, User, BorrowRecord } from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function getDevices(): Promise<Device[]> {
  return request<Device[]>('/devices');
}

export function getDevice(id: string): Promise<Device> {
  return request<Device>(`/devices/${id}`);
}

export function submitBorrow(deviceId: string, userId: string): Promise<BorrowRecord> {
  return request<BorrowRecord>('/borrow', {
    method: 'POST',
    body: JSON.stringify({ deviceId, userId }),
  });
}

export function confirmReturn(recordId: string): Promise<BorrowRecord> {
  return request<BorrowRecord>('/return', {
    method: 'POST',
    body: JSON.stringify({ recordId }),
  });
}

export function getUser(id: string): Promise<User> {
  return request<User>(`/users/${id}`);
}

export function getAllRecords(): Promise<BorrowRecord[]> {
  return request<BorrowRecord[]>('/records');
}
