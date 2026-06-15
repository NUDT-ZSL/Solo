import { Caregiver, Order, OrderStatus } from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    ...options
  });
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }
  return response.json();
}

export const api = {
  async getCaregivers(): Promise<Caregiver[]> {
    return request<Caregiver[]>('/caregivers');
  },

  async getCaregiver(id: string): Promise<Caregiver> {
    return request<Caregiver>(`/caregivers/${id}`);
  },

  async getOrders(params?: { caregiverId?: string; ownerId?: string }): Promise<Order[]> {
    const query = new URLSearchParams();
    if (params?.caregiverId) query.set('caregiverId', params.caregiverId);
    if (params?.ownerId) query.set('ownerId', params.ownerId);
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    return request<Order[]>(`/orders${queryStr}`);
  },

  async createOrder(data: Partial<Order>): Promise<Order> {
    return request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    return request<Order>(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    return request<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async addOrderReview(id: string, rating: number, review: string): Promise<Order> {
    return request<Order>(`/orders/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ rating, review })
    });
  }
};
