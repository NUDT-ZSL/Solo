import { v4 as uuidv4 } from 'uuid';
import { PetState, PetType, EventEntry } from '../../shared/types';

class PetManager {
  private pets: Map<string, PetState> = new Map();
  private hungerInterval: ReturnType<typeof setInterval> | null = null;
  private healthInterval: ReturnType<typeof setInterval> | null = null;
  private onUpdate: ((pet: PetState) => void) | null = null;

  createPet(ownerId: string, name: string, type: PetType): PetState {
    const pet: PetState = {
      id: uuidv4(),
      name,
      type,
      ownerId,
      health: 80,
      happiness: 70,
      hunger: 70,
    };
    this.pets.set(ownerId, pet);
    return { ...pet };
  }

  feed(ownerId: string): { pet: PetState; event: EventEntry } | null {
    const pet = this.pets.get(ownerId);
    if (!pet) return null;
    const prev = pet.hunger;
    pet.hunger = Math.min(100, pet.hunger + 15);
    const actual = pet.hunger - prev;
    return {
      pet: { ...pet },
      event: {
        id: uuidv4(),
        petId: pet.id,
        type: 'feed',
        timestamp: Date.now(),
        valueChange: { hunger: actual },
      },
    };
  }

  play(ownerId: string): { pet: PetState; event: EventEntry } | null {
    const pet = this.pets.get(ownerId);
    if (!pet) return null;
    const prev = pet.happiness;
    pet.happiness = Math.min(100, pet.happiness + 10);
    const actual = pet.happiness - prev;
    return {
      pet: { ...pet },
      event: {
        id: uuidv4(),
        petId: pet.id,
        type: 'play',
        timestamp: Date.now(),
        valueChange: { happiness: actual },
      },
    };
  }

  train(ownerId: string): { pet: PetState; event: EventEntry } | null {
    const pet = this.pets.get(ownerId);
    if (!pet) return null;
    if (pet.happiness < 5) return null;
    pet.happiness = Math.max(0, pet.happiness - 5);
    pet.health = Math.min(100, pet.health + 8);
    return {
      pet: { ...pet },
      event: {
        id: uuidv4(),
        petId: pet.id,
        type: 'train',
        timestamp: Date.now(),
        valueChange: { happiness: -5, health: 8 },
      },
    };
  }

  getPet(ownerId: string): PetState | undefined {
    const pet = this.pets.get(ownerId);
    return pet ? { ...pet } : undefined;
  }

  getAllPets(): PetState[] {
    return Array.from(this.pets.values()).map((p) => ({ ...p }));
  }

  removePet(ownerId: string): PetState | undefined {
    const pet = this.pets.get(ownerId);
    if (pet) {
      this.pets.delete(ownerId);
      return { ...pet };
    }
    return undefined;
  }

  updatePet(pet: PetState): void {
    this.pets.set(pet.ownerId, { ...pet });
  }

  startDecay(onUpdate: (pet: PetState) => void): void {
    this.onUpdate = onUpdate;

    this.hungerInterval = setInterval(() => {
      this.pets.forEach((pet) => {
        pet.hunger = Math.max(0, pet.hunger - 2);
        if (this.onUpdate) this.onUpdate({ ...pet });
      });
    }, 30000);

    this.healthInterval = setInterval(() => {
      this.pets.forEach((pet) => {
        if (pet.hunger < 20) {
          pet.health = Math.max(0, pet.health - 3);
          if (this.onUpdate) this.onUpdate({ ...pet });
        }
      });
    }, 10000);
  }

  stopDecay(): void {
    if (this.hungerInterval) {
      clearInterval(this.hungerInterval);
      this.hungerInterval = null;
    }
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }
}

export const petManager = new PetManager();
