export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  personalityTags: string[];
  signature: string;
  avatar: string;
  isLost: boolean;
  lastSeenTime?: string;
  ownerContact?: string;
  snackCount: number;
  createdAt: string;
}

type PetStoreListener = (pets: Pet[]) => void;

class PetStore {
  private pets: Map<string, Pet>;
  private listeners: Set<PetStoreListener>;

  constructor() {
    this.pets = new Map();
    this.listeners = new Set();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('petStore');
      if (stored) {
        const data = JSON.parse(stored) as Pet[];
        data.forEach(pet => this.pets.set(pet.id, pet));
      }
    } catch (e) {
      console.error('Failed to load pet store:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.pets.values());
      localStorage.setItem('petStore', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save pet store:', e);
    }
  }

  private notifyListeners(): void {
    const pets = this.getAllPets();
    this.listeners.forEach(listener => listener(pets));
  }

  subscribe(listener: PetStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getAllPets(): Pet[] {
    return Array.from(this.pets.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getPetById(id: string): Pet | undefined {
    return this.pets.get(id);
  }

  addPet(pet: Omit<Pet, 'id' | 'createdAt' | 'snackCount' | 'isLost'>): Pet {
    const id = `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newPet: Pet = {
      ...pet,
      id,
      isLost: false,
      snackCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.pets.set(id, newPet);
    this.saveToStorage();
    this.notifyListeners();
    return newPet;
  }

  updatePet(id: string, updates: Partial<Pet>): Pet | undefined {
    const pet = this.pets.get(id);
    if (!pet) return undefined;

    const updatedPet = { ...pet, ...updates };
    this.pets.set(id, updatedPet);
    this.saveToStorage();
    this.notifyListeners();
    return updatedPet;
  }

  deletePet(id: string): boolean {
    const result = this.pets.delete(id);
    if (result) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return result;
  }

  enableLostMode(id: string, ownerContact: string, lastSeenTime: string): Pet | undefined {
    return this.updatePet(id, {
      isLost: true,
      ownerContact,
      lastSeenTime,
    });
  }

  disableLostMode(id: string): Pet | undefined {
    return this.updatePet(id, {
      isLost: false,
      ownerContact: undefined,
      lastSeenTime: undefined,
    });
  }

  addSnack(id: string): Pet | undefined {
    const pet = this.pets.get(id);
    if (!pet) return undefined;

    return this.updatePet(id, {
      snackCount: pet.snackCount + 1,
    });
  }

  getBadgeLevel(snackCount: number): 'none' | 'bronze' | 'silver' | 'gold' {
    if (snackCount >= 100) return 'gold';
    if (snackCount >= 50) return 'silver';
    if (snackCount >= 10) return 'bronze';
    return 'none';
  }
}

export const petStore = new PetStore();

export const PERSONALITY_OPTIONS = [
  '活泼好动',
  '安静温顺',
  '贪吃嘴馋',
  '爱撒娇',
  '高冷傲娇',
  '胆小怕生',
  '好奇心强',
  '友善亲人',
];
