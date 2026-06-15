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
      facilities: ['电源', '水源', '烧烤架'],
      bookedDates: []
    },
    {
      id: uuidv4(),
      code: 'B-002',
      type: 'rv',
      maxPeople: 6,
      pricePerNight: 280,
      facilities: ['电源', '水源', '排污口'],
      bookedDates: []
    },
    {
      id: uuidv4(),
      code: 'C-003',
      type: 'cabin',
      maxPeople: 8,
      pricePerNight: 580,
      facilities: ['电源', '水源', '空调', '卫生间'],
      bookedDates: []
    }
  ];
  defaultCampsites.forEach(c => campsites.set(c.id, c));

  const equipment = new Map<string, Equipment>();
  const defaultEquipment: Equipment[] = [
    {
      id: uuidv4(),
      name: '双人帐篷',
      category: 'tent',
      dailyRent: 50,
      stock: 15,
      imageUrl: '',
      description: '防水防风双人帐篷，适合2-3人使用'
    },
    {
      id: uuidv4(),
      name: '羽绒睡袋',
      category: 'sleepingBag',
      dailyRent: 30,
      stock: 20,
      imageUrl: '',
      description: '舒适温度-5°C，适合春秋冬季'
    },
    {
      id: uuidv4(),
      name: '便携炉具',
      category: 'stove',
      dailyRent: 25,
      stock: 10,
      imageUrl: '',
      description: '瓦斯炉具，防风设计，附带锅具'
    },
    {
      id: uuidv4(),
      name: 'LED营地灯',
      category: 'lamp',
      dailyRent: 15,
      stock: 25,
      imageUrl: '',
      description: '可充电LED灯，三档亮度调节'
    },
    {
      id: uuidv4(),
      name: '登山背包 60L',
      category: 'backpack',
      dailyRent: 20,
      stock: 12,
      imageUrl: '',
      description: '专业登山背包，防水耐磨，多隔层设计'
    }
  ];
  defaultEquipment.forEach(e => equipment.set(e.id, e));

  return {
    campsites,
    equipment,
    cart: [],
    orders: []
  };
}

let state: AppState = createInitialState();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

export const store = {
  getState: (): AppState => state,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  addCampsite: (campsite: Omit<Campsite, 'id' | 'bookedDates'>): Campsite => {
    const newCampsite: Campsite = {
      ...campsite,
      id: uuidv4(),
      bookedDates: []
    };
    const newCampsites = new Map(state.campsites);
    newCampsites.set(newCampsite.id, newCampsite);
    state = { ...state, campsites: newCampsites };
    notify();
    return newCampsite;
  },

  updateCampsite: (id: string, updates: Partial<Omit<Campsite, 'id'>>): void => {
    const existing = state.campsites.get(id);
    if (!existing) return;
    const newCampsites = new Map(state.campsites);
    newCampsites.set(id, { ...existing, ...updates });
    state = { ...state, campsites: newCampsites };
    notify();
  },

  removeCampsite: (id: string): void => {
    const newCampsites = new Map(state.campsites);
    newCampsites.delete(id);
    state = { ...state, campsites: newCampsites };
    notify();
  },

  getAvailableCampsites: (startDate: string, endDate: string): Campsite[] => {
    return Array.from(state.campsites.values()).filter(campsite => {
      return !campsite.bookedDates.some(d => d >= startDate && d <= endDate);
    });
  },

  getCampsiteList: (): Campsite[] => {
    return Array.from(state.campsites.values());
  },

  addEquipment: (equipment: Omit<Equipment, 'id'>): Equipment => {
    const newEquipment: Equipment = {
      ...equipment,
      id: uuidv4()
    };
    const newEquipmentMap = new Map(state.equipment);
    newEquipmentMap.set(newEquipment.id, newEquipment);
    state = { ...state, equipment: newEquipmentMap };
    notify();
    return newEquipment;
  },

  reduceStock: (equipmentId: string, quantity: number): boolean => {
    const existing = state.equipment.get(equipmentId);
    if (!existing || existing.stock < quantity) return false;
    const newEquipment = new Map(state.equipment);
    newEquipment.set(equipmentId, { ...existing, stock: existing.stock - quantity });
    state = { ...state, equipment: newEquipment };
    notify();
    return true;
  },

  addStock: (equipmentId: string, quantity: number): void => {
    const existing = state.equipment.get(equipmentId);
    if (!existing) return;
    const newEquipment = new Map(state.equipment);
    newEquipment.set(equipmentId, { ...existing, stock: existing.stock + quantity });
    state = { ...state, equipment: newEquipment };
    notify();
  },

  getEquipmentList: (): Equipment[] => {
    return Array.from(state.equipment.values());
  },

  addToCart: (itemType: 'campsite' | 'equipment', days: number, id: string): boolean => {
    let name = '';
    let unitPrice = 0;
    let campsiteId: string | undefined;
    let equipmentId: string | undefined;

    if (itemType === 'campsite') {
      const campsite = state.campsites.get(id);
      if (!campsite) return false;
      campsiteId = id;
      name = campsite.code;
      unitPrice = campsite.pricePerNight;
    } else {
      const eq = state.equipment.get(id);
      if (!eq) return false;
      equipmentId = id;
      name = eq.name;
      unitPrice = eq.dailyRent;
    }

    const newItem: CartItem = {
      id: uuidv4(),
      itemType,
      campsiteId,
      equipmentId,
      days,
      unitPrice,
      name
    };

    state = { ...state, cart: [...state.cart, newItem] };
    notify();
    return true;
  },

  removeFromCart: (cartItemId: string): void => {
    state = { ...state, cart: state.cart.filter(item => item.id !== cartItemId) };
    notify();
  },

  clearCart: (): void => {
    state = { ...state, cart: [] };
    notify();
  },

  calcTotal: (): number => {
    return state.cart.reduce((sum, item) => sum + item.unitPrice * item.days, 0);
  },

  submitOrder: (customerName: string, customerEmail: string): string | null => {
    for (const item of state.cart) {
      if (item.itemType === 'equipment' && item.equipmentId) {
        const eq = state.equipment.get(item.equipmentId);
        if (!eq || eq.stock < 1) return null;
      }
    }

    for (const item of state.cart) {
      if (item.itemType === 'equipment' && item.equipmentId) {
        store.reduceStock(item.equipmentId, 1);
      }
    }

    const campsiteItem = state.cart.find(i => i.itemType === 'campsite');
    const equipmentItems = state.cart
      .filter(i => i.itemType === 'equipment' && i.equipmentId)
      .map(i => ({ equipmentId: i.equipmentId!, days: i.days }));

    const order: Order = {
      id: uuidv4(),
      campsiteId: campsiteItem?.campsiteId,
      campsiteDays: campsiteItem?.days || 0,
      equipmentItems,
      totalPrice: store.calcTotal(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      customerName,
      customerEmail
    };

    state = { ...state, orders: [...state.orders, order], cart: [] };
    notify();
    return order.id;
  },

  getOrderList: (): Order[] => {
    return state.orders;
  },

  updateOrderStatus: (orderId: string, status: OrderStatus): void => {
    const newOrders = state.orders.map(o =>
      o.id === orderId ? { ...o, status } : o
    );
    state = { ...state, orders: newOrders };
    notify();
  }
};
