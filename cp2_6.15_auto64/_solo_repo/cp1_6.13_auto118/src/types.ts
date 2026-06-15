export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  active: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  pointsEarned: number;
  status: 'pending' | 'preparing' | 'completed';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  points: number;
  level: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  points: number;
  image: string;
  active: boolean;
}

export interface PointsHistory {
  id: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  createdAt: string;
}

export type Page = 'menu' | 'profile' | 'admin-orders' | 'admin-menu';
