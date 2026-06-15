import { v4 as uuidv4 } from 'uuid';

export type CampsiteType = 'tent' | 'rv' | 'cabin';

export interface Campsite {
  id: string;
  code: string;
  type: CampsiteType;
  maxPeople: number;
  pricePerNight: number;
  facilities: string[];
  bookedDates: string[];
}

export type EquipmentCategory = 'tent' | 'sleepingBag' | 'stove' | 'lamp' | 'backpack';

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  dailyRent: number;
  stock: number;
  imageUrl: string;
  description: string;
}

export interface CartItem {
  id: string;
  itemType: 'campsite' | 'equipment';
  campsiteId?: string;
  equipmentId?: string;
  days: number;
  unitPrice: number;
  name: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected';

export interface Order {
  id: string;
  campsiteId?: string;
  campsiteDays: number;
  equipmentItems: { equipmentId: string; days: number }[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  customerName: string;
  customerEmail: string;
}

export interface AppState {
  campsites: Map<string, Campsite>;
  equipment: Map<string, Equipment>;
  cart: CartItem[];
  orders: Order[];
}

export function createInitialState(): AppState {
  const campsites = new Map<string, Campsite>();
  const defaultCampsites: Campsite[] = [
    {
      id: uuidv4(),
      code: 'A-001',
      type: 'tent',
      maxPeople: 4,
      pricePerNight: 120,
      facilities: ['电源', '水源', '