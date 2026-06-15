export interface Order {
  id: string;
  customerName: string;
  phone: string;
  flowerType: string;
  quantity: number;
  address: string;
  note: string;
}

interface PreferenceEntry {
  ratings: number[];
}

const orders: Order[] = [];
const preferences: Map<string, Map<string, PreferenceEntry>> = new Map();
let orderCounter = 0;

function generateOrderId(): string {
  orderCounter++;
  return `ORD-${String(orderCounter).padStart(4, '0')}`;
}

export function addOrder(order: Omit<Order, 'id'>): Order {
  const newOrder: Order = { ...order, id: generateOrderId() };
  orders.push(newOrder);
  return newOrder;
}

export function updateOrder(id: string, updates: Partial<Omit<Order, 'id'>>): Order | null {
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...updates };
  return orders[idx];
}

export function deleteOrder(id: string): boolean {
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return false;
  orders.splice(idx, 1);
  return true;
}

export function getOrders(): Order[] {
  return [...orders];
}

export function setRating(customerName: string, flowerType: string, rating: number): void {
  if (!preferences.has(customerName)) {
    preferences.set(customerName, new Map());
  }
  const customerPrefs = preferences.get(customerName)!;
  if (!customerPrefs.has(flowerType)) {
    customerPrefs.set(flowerType, { ratings: [] });
  }
  const entry = customerPrefs.get(flowerType)!;
  entry.ratings.push(rating);
}

export function getRating(customerName: string, flowerType: string): number[] {
  const customerPrefs = preferences.get(customerName);
  if (!customerPrefs) return [];
  const entry = customerPrefs.get(flowerType);
  if (!entry) return [];
  return [...entry.ratings];
}

export interface Recommendation {
  flowerType: string;
  averageScore: number;
}

export function getRecommendation(customerName: string): Recommendation[] {
  const customerPrefs = preferences.get(customerName);
  if (!customerPrefs) return [];

  const results: Recommendation[] = [];
  customerPrefs.forEach((entry, flowerType) => {
    if (entry.ratings.length === 0) return;
    const avg = entry.ratings.reduce((sum, r) => sum + r, 0) / entry.ratings.length;
    results.push({ flowerType, averageScore: Math.round(avg * 10) / 10 });
  });

  results.sort((a, b) => b.averageScore - a.averageScore);
  return results.slice(0, 3);
}

export function generateMockOrders(count: number): Order[] {
  const names = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十'];
  const flowers = ['玫瑰', '百合', '郁金香', '混搭', '向日葵', '康乃馨'];
  const addresses = ['北京市朝阳区建国路88号', '上海市浦东新区陆家嘴环路100号', '广州市天河区体育西路50号', '深圳市南山区科技园路20号'];

  for (let i = 0; i < count; i++) {
    const name = names[i % names.length];
    const flower = flowers[i % flowers.length];
    const order: Order = {
      id: generateOrderId(),
      customerName: name,
      phone: `138${String(i + 1).padStart(8, '0')}`,
      flowerType: flower,
      quantity: (i % 5) + 1,
      address: addresses[i % addresses.length],
      note: i % 3 === 0 ? '请附赠贺卡' : '',
    };
    orders.push(order);

    setRating(name, flower, (i % 5) + 1);
  }

  return orders;
}
