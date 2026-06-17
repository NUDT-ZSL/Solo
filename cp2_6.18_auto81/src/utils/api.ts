import type { Item } from '../types';

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
  return request<Item>(`/items/${itemId}/apply`, {
    method: 'POST',
    body: JSON.stringify({ applicant }),
  });
}

export function updateItemStatus(itemId: string, status: string): Promise<Item> {
  return request<Item>(`/items/${itemId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function exportCSV(): Promise<void> {
  const response = await fetch(`${BASE_URL}/items/export`);
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
