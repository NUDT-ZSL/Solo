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
  status: 'new' | 'making' | 'completed';
  createdAt: string;
}

export interface MaterialConsumption {
  name: string;
  quantity: number;
  unit: string;
}

export interface BakedProduct {
  name: string;
  quantity: number;
}

export interface BakingLog {
  id: string;
  date: string;
  materials: MaterialConsumption[];
  products: BakedProduct[];
  notes: string;
  createdAt: string;
}

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export function fetchOrders(): Promise<Order[]> {
  return request<Order[]>('/orders');
}

export function createOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
  return request<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

export function updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
  return request<Order>(`/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function fetchLogs(): Promise<BakingLog[]> {
  return request<BakingLog[]>('/logs');
}

export function createLog(log: Omit<BakingLog, 'id' | 'createdAt'>): Promise<BakingLog> {
  return request<BakingLog>('/logs', {
    method: 'POST',
    body: JSON.stringify(log),
  });
}
