export interface OrderItem {
  name: string;
  quantity: number;
}

export interface Order {
  id: string;
  orderNo: string;
  customerName: string;
  phone: string;
  items: OrderItem[];
  status: 'new' | 'processing' | 'completed';
  createdAt: string;
  updatedAt?: string;
}

export interface IngredientItem {
  name: string;
  quantity: number;
}

export interface ProductItem {
  name: string;
  quantity: number;
}

export interface Log {
  id: string;
  date: string;
  ingredients: IngredientItem[];
  products: ProductItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = '/api';

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export const fetchOrders = (status?: string): Promise<Order[]> => {
  const url = status ? `/orders?status=${encodeURIComponent(status)}` : '/orders';
  return request<Order[]>(url);
};

export const fetchOrder = (id: string): Promise<Order> => {
  return request<Order>(`/orders/${id}`);
};

export const createOrder = (data: {
  customerName: string;
  phone: string;
  items: OrderItem[];
}): Promise<Order> => {
  return request<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateOrderStatus = (id: string, status: 'new' | 'processing' | 'completed'): Promise<Order> => {
  return request<Order>(`/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

export const fetchLogs = (): Promise<Log[]> => {
  return request<Log[]>('/logs');
};

export const createLog = (data: {
  date: string;
  ingredients: IngredientItem[];
  products: ProductItem[];
  notes: string;
}): Promise<Log> => {
  return request<Log>('/logs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
