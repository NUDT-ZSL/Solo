import type { User, Book, ExchangeRequest, ExchangeRecord, AdminStats } from '../types';

const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || '请求失败');
  }
  return res.json();
}

export const usersApi = {
  register: (data: { nickname: string; email: string; password: string }) =>
    request<{ user: User; token: string }>('/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getById: (id: string) => request<User>(`/users/${id}`),
  update: (id: string, data: Partial<User>) =>
    request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  list: () => request<User[]>('/users'),
};

export const booksApi = {
  list: () => request<Book[]>('/books'),
  recent: () => request<Book[]>('/books/recent'),
  search: (q: string) => request<Book[]>(`/books/search?q=${encodeURIComponent(q)}`),
  getById: (id: string) => request<Book>(`/books/${id}`),
  create: (data: Omit<Book, 'id' | 'createdAt'>) =>
    request<Book>('/books', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const exchangesApi = {
  list: (userId: string) => request<ExchangeRecord[]>(`/exchanges?userId=${userId}`),
  recent: () => request<ExchangeRecord[]>('/exchanges/recent'),
  getRequests: (userId: string) =>
    request<ExchangeRequest[]>(`/exchanges/requests?userId=${userId}`),
  createRequest: (data: { bookId: string; requesterId: string; ownerId: string }) =>
    request<ExchangeRequest>('/exchanges/request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  respondRequest: (id: string, accept: boolean) =>
    request<{ success: boolean }>(`/exchanges/${id}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ accept }),
    }),
  getHistory: (id: string) => request<TransferNode[]>(`/exchanges/${id}/history`),
  close: (id: string) =>
    request<ExchangeRecord>(`/exchanges/${id}/close`, { method: 'PUT' }),
  adminStats: () => request<AdminStats>('/admin/stats'),
  adminRecords: () => request<ExchangeRecord[]>('/admin/records'),
};
