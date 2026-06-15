import { Pet } from './types';
import { dataStore } from './DataStore';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const PetService = {
  createPet: (petData: Omit<Pet, 'id' | 'createdAt'>): Promise<Pet> => {
    return new Promise((resolve) => {
      const newPet: Pet = {
        ...petData,
        id: generateId(),
        createdAt: Date.now(),
      };
      dataStore.addPet(newPet);
      resolve(newPet);
    });
  },

  updatePet: (id: string, updates: Partial<Pet>): Promise<Pet | undefined> => {
    return new Promise((resolve) => {
      const updated = dataStore.updatePet(id, updates);
      resolve(updated);
    });
  },

  deletePet: (id: string): Promise<void> => {
    return new Promise((resolve) => {
      dataStore.deletePet(id);
      resolve();
    });
  },

  getPet: (id: string): Pet | undefined => {
    return dataStore.getPetById(id);
  },

  getAllPets: (): Pet[] => {
    return dataStore.getPets();
  },

  subscribe: (callback: (pets: Pet[]) => void): (() => void) => {
    return dataStore.on('petsChanged', callback as (data?: unknown) => void);
  },
};
