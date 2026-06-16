export interface Member {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
  isAdmin?: boolean;
  createdAt: string;
}

export interface Veggie {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Box {
  id: string;
  name: string;
  size: 'small' | 'medium' | 'large';
  price: number;
  description: string;
  veggies: Veggie[];
  swapOptions: { from: string; to: string }[];
  isActive: boolean;
  sortOrder: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'delivering' | 'delivered' | 'cancelled';
export type DeliveryFrequency = 'weekly' | 'biweekly';

export interface OrderItem {
  boxId: string;
  boxName: string;
  price: number;
  quantity: number;
  swaps: { from: string; to: string }[];
}

export interface Order {
  id: string;
  memberId: string;
  memberName: string;
  items: OrderItem[];
  totalPrice: number;
  frequency: DeliveryFrequency;
  deliveryDate: string;
  status: OrderStatus;
  address: string;
  phone: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  memberId: string;
  type: 'reminder' | 'status' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
