import type { Item, ItemStatus } from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export function fetchItems(): Promise<Item[]> {
  return request<Item[]>('/items');
}

export function fetchItem(id: string): Promise<Item> {
  return request<Item>(`/items/${id}`);
}

export function createItem(
  item: Omit<Item, 'id' | 'publishTime' | 'applications' | 'status'>
): Promise<Item> {
  return request<Item>('/items', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export function applyForItem(itemId: string, applicant: string): Promise<Item> {
  return request<Item>(`/items/${itemId}/applications`, {
    method: 'POST',
    body: JSON.stringify({ applicant }),
  });
}

export function updateItem(
  itemId: string,
  item: Partial<Omit<Item, 'id' | 'publishTime' | 'applications'>>
): Promise<Item> {
  return request<Item>(`/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
}

export function clearExpiredApplications(): Promise<{ count: number }> {
  return request<{ count: number }>('/applications/clear-expired', {
    method: 'POST',
  });
}

export function updateItemStatus(itemId: string, status: ItemStatus): Promise<Item> {
  return request<Item>(`/items/${itemId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function exportCSV(): Promise<void> {
  const response = await fetch(`${BASE_URL}/export`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'items.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
