import axios from 'axios';
import type { Member, Box, Order, Notification } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const authAPI = {
  login: (email: string, password: string) =>
    api.post<{ success: boolean; member?: Omit<Member, 'password'>; message?: string }>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; phone: string; address: string }) =>
    api.post<{ success: boolean; member?: Omit<Member, 'password'>; message?: string }>('/auth/register', data),
};

export const boxesAPI = {
  getAll: (activeOnly = false) =>
    api.get<Box[]>('/boxes', { params: { activeOnly } }),
  getById: (id: string) => api.get<Box>(`/boxes/${id}`),
  create: (box: Omit<Box, 'id' | 'sortOrder' | 'isActive'>) =>
    api.post<Box>('/boxes', box),
  update: (id: string, box: Partial<Box>) =>
    api.put<Box>(`/boxes/${id}`, box),
  remove: (id: string) => api.delete(`/boxes/${id}`),
  reorder: (ids: string[]) =>
    api.post('/boxes/reorder', { ids }),
};

export const ordersAPI = {
  getAll: (params?: { memberId?: string; status?: string; date?: string }) =>
    api.get<Order[]>('/orders', { params }),
  getById: (id: string) => api.get<Order>(`/orders/${id}`),
  create: (order: Omit<Order, 'id' | 'status' | 'createdAt' | 'updatedAt'>) =>
    api.post<Order>('/orders', order),
  updateStatus: (id: string, status: string) =>
    api.put<Order>(`/orders/${id}/status`, { status }),
  batchUpdateStatus: (ids: string[], status: string) =>
    api.put('/orders/batch-status', { ids, status }),
  cancel: (id: string) => api.put<Order>(`/orders/${id}/cancel`),
};

export const notificationsAPI = {
  getByMemberId: (memberId: string) =>
    api.get<Notification[]>(`/notifications/${memberId}`),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
};

export default api;
