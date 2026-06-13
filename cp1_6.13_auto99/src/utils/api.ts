import axios from 'axios';
import type { Book, CartItem, ShareData } from '../types';

const API_BASE = '/api';

const api = axios.create({ baseURL: API_BASE, timeout: 5000 });

export const bookApi = {
  getAll: () => api.get<Book[]>('/books').then(r => r.data),
  getById: (id: string) => api.get<Book>(`/books/${id}`).then(r => r.data),
  getByCategory: (category: string) => api.get<Book[]>(`/books/category/${category}`).then(r => r.data)
};

export const cartApi = {
  get: (userId: string) => api.get<CartItem[]>(`/cart/${userId}`).then(r => r.data),
  save: (userId: string, items: CartItem[]) => api.post('/cart', { userId, items }).then(r => r.data)
};

export const shareApi = {
  create: (payload: { userId: string; items: CartItem[]; name?: string }) =>
    api.post<{ id: string; share: ShareData }>('/share', payload).then(r => r.data),
  get: (id: string) => api.get<ShareData>(`/share/${id}`).then(r => r.data)
};

export function getUserId(): string {
  let uid = localStorage.getItem('bookshelf_uid');
  if (!uid) {
    uid = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('bookshelf_uid', uid);
  }
  return uid;
}
