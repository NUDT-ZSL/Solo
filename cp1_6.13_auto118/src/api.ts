import axios from 'axios';
import type { MenuItem, Order, User, Reward, PointsHistory, OrderItem } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export interface SubmitOrderPayload {
  items: { menuItemId: string; name: string; price: number; quantity: number }[];
}

export async function getMenu(category?: string): Promise<MenuItem[]> {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  const res = await api.get<MenuItem[]>('/menu', { params });
  return res.data;
}

export async function getAllMenu(): Promise<MenuItem[]> {
  const res = await api.get<MenuItem[]>('/menu', { params: { includeInactive: 'true' } });
  return res.data;
}

export async function getOrderHistory(): Promise<Order[]> {
  const res = await api.get<Order[]>('/order');
  return res.data;
}

export async function submitOrder(payload: SubmitOrderPayload): Promise<Order> {
  const res = await api.post<Order>('/order', payload);
  return res.data;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<Order> {
  const res = await api.put<Order>(`/order/${orderId}/status`, { status });
  return res.data;
}

export async function redeemReward(rewardId: string): Promise<{
  success: boolean;
  remainingPoints: number;
  redemption: PointsHistory;
}> {
  const res = await api.post(`/reward/${rewardId}/redeem`);
  return res.data;
}

export async function getRewards(): Promise<Reward[]> {
  const res = await api.get<Reward[]>('/reward');
  return res.data;
}

export async function getUser(): Promise<User> {
  const res = await api.get<User>('/user');
  return res.data;
}

export async function getPointsHistory(): Promise<PointsHistory[]> {
  const res = await api.get<PointsHistory[]>('/user/points-history');
  return res.data;
}

export async function createMenuItem(item: Omit<MenuItem, 'id' | 'active'>): Promise<MenuItem> {
  const res = await api.post<MenuItem>('/menu', item);
  return res.data;
}

export async function updateMenuItem(
  id: string,
  item: Partial<Omit<MenuItem, 'id'>>
): Promise<MenuItem> {
  const res = await api.put<MenuItem>(`/menu/${id}`, item);
  return res.data;
}

export async function deactivateMenuItem(id: string): Promise<void> {
  await api.delete(`/menu/${id}`);
}
