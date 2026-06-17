import type { Device, User, BorrowRecord, BorrowResult } from '../types';

/* borrowApi.ts - 后端 API 调用模块
   调用关系：被 src/hooks/useBorrow.ts 及 src/pages/* 直接调用
   数据流向：浏览器 fetch → Express(server/index.js) → data/*.json
*/

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `请求失败 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function getDevices(): Promise<Device[]> {
  return request<Device[]>(`${BASE}/devices`);
}

export function getDeviceById(id: string): Promise<Device> {
  return request<Device>(`${BASE}/devices/${id}`);
}

export function getUserById(id: string): Promise<User> {
  return request<User>(`${BASE}/users/${id}`);
}

export function getAllRecords(): Promise<BorrowRecord[]> {
  return request<BorrowRecord[]>(`${BASE}/records`);
}

export function submitBorrow(deviceId: string, userId: string): Promise<BorrowResult> {
  return request<BorrowResult>(`${BASE}/borrow`, {
    method: 'POST',
    body: JSON.stringify({ deviceId, userId }),
  });
}

export function confirmReturn(recordId: string): Promise<{ record: BorrowRecord; user: User; device: Device }> {
  return request(`${BASE}/return`, {
    method: 'POST',
    body: JSON.stringify({ recordId }),
  });
}
