import type { Device, User, BorrowRecord, ApiResponse } from '@/types';

const BASE_URL = '/api';

const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const data = await response.json();
  return data;
};

export const getDevices = async (): Promise<ApiResponse<Device[]>> => {
  const response = await fetch(`${BASE_URL}/devices`);
  return handleResponse<Device[]>(response);
};

export const getDeviceById = async (id: string): Promise<ApiResponse<Device>> => {
  const response = await fetch(`${BASE_URL}/devices/${id}`);
  return handleResponse<Device>(response);
};

export const submitBorrow = async (deviceId: string, userId: string): Promise<ApiResponse<BorrowRecord>> => {
  const response = await fetch(`${BASE_URL}/borrow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceId, userId }),
  });
  return handleResponse<BorrowRecord>(response);
};

export const confirmReturn = async (recordId: string): Promise<ApiResponse<BorrowRecord>> => {
  const response = await fetch(`${BASE_URL}/return`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recordId }),
  });
  return handleResponse<BorrowRecord>(response);
};

export const getUserById = async (id: string): Promise<ApiResponse<User>> => {
  const response = await fetch(`${BASE_URL}/users/${id}`);
  return handleResponse<User>(response);
};

export const getRecords = async (userId?: string): Promise<ApiResponse<BorrowRecord[]>> => {
  const url = userId ? `${BASE_URL}/records?userId=${userId}` : `${BASE_URL}/records`;
  const response = await fetch(url);
  return handleResponse<BorrowRecord[]>(response);
};
