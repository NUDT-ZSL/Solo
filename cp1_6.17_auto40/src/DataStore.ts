export type BookingPurpose = 'baking' | 'chinese' | 'dessert';

export interface Booking {
  id: string;
  timeSlot: string;
  userName: string;
  peopleCount: number;
  purpose: BookingPurpose;
  createdAt: Date;
}

export type EquipmentStatus = 'idle' | 'in-use' | 'maintenance';

export interface Equipment {
  id: string;
  name: string;
  status: EquipmentStatus;
  occupiedUntil?: Date;
  lockedBy?: string;
}

export type IngredientCategory = 'dry' | 'refrigerated' | 'frozen';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  purchaseDate: Date;
  shelfLifeDays: number;
  quantity: number;
  isHistorical: boolean;
}

export interface AppState {
  bookings: Booking[];
  equipments: Equipment[];
  ingredients: Ingredient[];
}

type Listener = () => void;

const MAX_BOOKINGS_PER_SLOT = 3;
const TIME_SLOTS = generateTimeSlots();

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

class AppDataStore {
  private bookingsMap = new Map<string, Booking[]>();
  private equipmentsMap = new Map<string, Equipment>();
  private ingredientsMap = new Map<string, Ingredient>();
  private listeners = new Set<Listener>();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const now = new Date();

    const initialEquipments: Equipment[] = [
      { id: 'oven', name: '烤箱', status: 'idle' },
      { id: 'stove', name: '灶台', status: 'in-use', occupiedUntil: new Date(now.getTime() + 2 * 60 * 60 * 1000) },
      { id: 'mixer', name: '搅拌机', status: 'idle' },
      { id: 'fridge', name: '冰箱', status: 'idle' },
    ];
    initialEquipments.forEach(eq => this.equipmentsMap.set(eq.id, eq));

    const todayStr = now.toISOString().split('T')[0];
    const initialBookings: Booking[] = [
      {
        id: generateId(),
        timeSlot: '08:00',
        userName: '张小明',
        peopleCount: 2,
        purpose: 'baking',
        createdAt: new Date(todayStr + 'T08:00:00'),
      },
      {
        id: generateId(),
        timeSlot: '10:00',
        userName: '李阿姨',
        peopleCount: 4,
        purpose: 'chinese',
        createdAt: new Date(todayStr + 'T10:00:00'),
      },
      {
        id: generateId(),
        timeSlot: '14:00',
        userName: '王大厨',
        peopleCount: 3,
        purpose: 'dessert',
        createdAt: new Date(todayStr + 'T14:00:00'),
      },
    ];
    initialBookings.forEach(b => {
      if (!this.bookingsMap.has(b.timeSlot)) {
        this.bookingsMap.set(b.timeSlot, []);
      }
      this.bookingsMap.get(b.timeSlot)!.push(b);
    });

    const purchaseDate1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const purchaseDate2 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const purchaseDate3 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    const initialIngredients: Ingredient[] = [
      {
        id: generateId(),
        name: '面粉',
        category: 'dry',
        purchaseDate: purchaseDate1,
        shelfLifeDays: 30,
        quantity: 5000,
        isHistorical: false,
      },
      {
        id: generateId(),
        name: '鸡蛋',
        category: 'refrigerated',
        purchaseDate: purchaseDate2,
        shelfLifeDays: 7,
        quantity: 30,
        isHistorical: false,
      },
      {
        id: generateId(),
        name: '牛奶',
        category: 'refrigerated',
        purchaseDate: purchaseDate3,
        shelfLifeDays: 3,
        quantity: 2000,
        isHistorical: false,
      },
      {
        id: generateId(),
        name: '鸡胸肉',
        category: 'frozen',
        purchaseDate: purchaseDate1,
        shelfLifeDays: 90,
        quantity: 1500,
        isHistorical: false,
      },
    ];
    initialIngredients.forEach(ing => this.ingredientsMap.set(ing.id, ing));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  getTimeSlots(): string[] {
    return [...TIME_SLOTS];
  }

  getBookingsBySlot(timeSlot: string): Booking[] {
    return this.bookingsMap.get(timeSlot) || [];
  }

  hasConflict(timeSlot: string): boolean {
    const bookings = this.getBookingsBySlot(timeSlot);
    return bookings.length >= MAX_BOOKINGS_PER_SLOT;
  }

  bookSlot(
    timeSlot: string,
    data: { userName: string; peopleCount: number; purpose: BookingPurpose }
  ): Booking | null {
    if (this.hasConflict(timeSlot)) {
      return null;
    }

    const booking: Booking = {
      id: generateId(),
      timeSlot,
      userName: data.userName,
      peopleCount: data.peopleCount,
      purpose: data.purpose,
      createdAt: new Date(),
    };

    if (!this.bookingsMap.has(timeSlot)) {
      this.bookingsMap.set(timeSlot, []);
    }
    this.bookingsMap.get(timeSlot)!.push(booking);
    this.notify();
    return booking;
  }

  releaseSlot(bookingId: string): boolean {
    for (const [timeSlot, bookings] of this.bookingsMap.entries()) {
      const index = bookings.findIndex(b => b.id === bookingId);
      if (index !== -1) {
        bookings.splice(index, 1);
        if (bookings.length === 0) {
          this.bookingsMap.delete(timeSlot);
        }
        this.notify();
        return true;
      }
    }
    return false;
  }

  findNextAvailableSlot(fromTime?: string): string | null {
    const startIndex = fromTime
      ? TIME_SLOTS.indexOf(fromTime)
      : 0;

    for (let i = startIndex; i < TIME_SLOTS.length; i++) {
      if (!this.hasConflict(TIME_SLOTS[i])) {
        return TIME_SLOTS[i];
      }
    }
    return null;
  }

  getEquipments(): Equipment[] {
    return Array.from(this.equipmentsMap.values());
  }

  lockEquipment(equipmentId: string, bookingId: string): boolean {
    const equipment = this.equipmentsMap.get(equipmentId);
    if (!equipment || equipment.status !== 'idle') {
      return false;
    }
    equipment.status = 'in-use';
    equipment.lockedBy = bookingId;
    const now = new Date();
    equipment.occupiedUntil = new Date(now.getTime() + 60 * 60 * 1000);
    this.notify();
    return true;
  }

  unlockEquipment(equipmentId: string): boolean {
    const equipment = this.equipmentsMap.get(equipmentId);
    if (!equipment || equipment.status !== 'in-use') {
      return false;
    }
    equipment.status = 'idle';
    equipment.lockedBy = undefined;
    equipment.occupiedUntil = undefined;
    this.notify();
    return true;
  }

  getIngredients(includeHistorical = false): Ingredient[] {
    const ingredients = Array.from(this.ingredientsMap.values());
    if (!includeHistorical) {
      return ingredients.filter(ing => !ing.isHistorical);
    }
    return ingredients;
  }

  addIngredient(data: {
    name: string;
    category: IngredientCategory;
    purchaseDate: Date;
    shelfLifeDays: number;
    quantity: number;
  }): Ingredient {
    const ingredient: Ingredient = {
      id: generateId(),
      name: data.name,
      category: data.category,
      purchaseDate: data.purchaseDate,
      shelfLifeDays: data.shelfLifeDays,
      quantity: data.quantity,
      isHistorical: false,
    };
    this.ingredientsMap.set(ingredient.id, ingredient);
    this.notify();
    return ingredient;
  }

  consumeIngredient(ingredientId: string, amount: number): boolean {
    const ingredient = this.ingredientsMap.get(ingredientId);
    if (!ingredient || ingredient.isHistorical || ingredient.quantity < amount) {
      return false;
    }
    ingredient.quantity -= amount;
    if (ingredient.quantity <= 0) {
      ingredient.quantity = 0;
      ingredient.isHistorical = true;
    }
    this.notify();
    return true;
  }

  getState(): AppState {
    const bookings: Booking[] = [];
    for (const slotBookings of this.bookingsMap.values()) {
      bookings.push(...slotBookings);
    }
    return {
      bookings,
      equipments: this.getEquipments(),
      ingredients: this.getIngredients(true),
    };
  }
}

export const appDataStore = new AppDataStore();
