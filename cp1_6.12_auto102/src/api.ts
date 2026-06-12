import axios from 'axios';

export type OrderItem = {
  id: number;
  item_name: string;
  qty: number;
  picked_qty: number;
};

export type Order = {
  id: number;
  order_id: string;
  customer_name: string;
  created_at: string;
  total_items: number;
  picked_items: number;
  items: OrderItem[];
  isComplete: boolean;
};

export type ItemStat = {
  item_name: string;
  total_qty: number;
  picked_qty: number;
};

export type Stats = {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  itemStats: ItemStat[];
};

export type ImportResult = {
  success: number;
  failed: number;
  message?: string;
};

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

export async function importOrders(csvContent: string): Promise<ImportResult> {
  const res = await api.post('/orders/import', { csvContent });
  return res.data;
}

export async function fetchOrders(params?: {
  search?: string;
  status?: 'all' | 'completed' | 'pending';
}): Promise<Order[]> {
  const res = await api.get('/orders', { params });
  return res.data;
}

export async function fetchStats(): Promise<Stats> {
  const res = await api.get('/stats');
  return res.data;
}

export async function updateItemPick(id: number, picked: boolean): Promise<void> {
  await api.post(`/items/${id}/pick`, { picked });
}

export async function batchUpdateItems(
  updates: Array<{ id: number; picked: boolean }>
): Promise<void> {
  await api.post('/items/batch-pick', { updates });
}
