import { Pet, Record } from './types';

type EventCallback = (data?: unknown) => void;

class DataStore {
  private pets: Pet[] = [];
  private records: Record[] = [];
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private readonly PETS_KEY = 'pet_health_pets';
  private readonly RECORDS_KEY = 'pet_health_records';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const petsData = localStorage.getItem(this.PETS_KEY);
      const recordsData = localStorage.getItem(this.RECORDS_KEY);
      if (petsData) this.pets = JSON.parse(petsData);
      if (recordsData) this.records = JSON.parse(recordsData);
    } catch (e) {
      console.error('Failed to load data from localStorage', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.PETS_KEY, JSON.stringify(this.pets));
      localStorage.setItem(this.RECORDS_KEY, JSON.stringify(this.records));
    } catch (e) {
      console.error('Failed to save data to localStorage', e);
    }
  }

  private emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error('Error in event callback', e);
        }
      });
    }
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)!.delete(callback);
  }

  getPets(): Pet[] {
    return [...this.pets];
  }

  getPetById(id: string): Pet | undefined {
    return this.pets.find((p) => p.id === id);
  }

  addPet(pet: Pet): void {
    this.pets.push(pet);
    this.saveToStorage();
    this.emit('petsChanged', this.pets);
  }

  updatePet(id: string, updates: Partial<Pet>): Pet | undefined {
    const index = this.pets.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    this.pets[index] = { ...this.pets[index], ...updates };
    this.saveToStorage();
    this.emit('petsChanged', this.pets);
    return this.pets[index];
  }

  deletePet(id: string): void {
    this.pets = this.pets.filter((p) => p.id !== id);
    this.records = this.records.filter((r) => r.petId !== id);
    this.saveToStorage();
    this.emit('petsChanged', this.pets);
    this.emit('recordsChanged', this.records);
  }

  getRecordsByPetId(petId: string): Record[] {
    return [...this.records.filter((r) => r.petId === petId)].sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }

  addRecord(record: Record): void {
    this.records.push(record);
    this.saveToStorage();
    this.emit('recordsChanged', this.records);
  }

  deleteRecord(id: string): void {
    this.records = this.records.filter((r) => r.id !== id);
    this.saveToStorage();
    this.emit('recordsChanged', this.records);
  }

  getAllRecords(): Record[] {
    return [...this.records];
  }
}

export const dataStore = new DataStore();
