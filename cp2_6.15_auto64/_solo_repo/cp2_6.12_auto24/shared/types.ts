export type PetType = 'cat' | 'dog' | 'dragon';

export interface PetState {
  id: string;
  name: string;
  type: PetType;
  ownerId: string;
  health: number;
  happiness: number;
  hunger: number;
}

export interface EventEntry {
  id: string;
  petId: string;
  type: 'feed' | 'play' | 'train';
  timestamp: number;
  valueChange: {
    health?: number;
    happiness?: number;
    hunger?: number;
  };
}

export interface RoomState {
  roomId: string;
  pets: Record<string, PetState>;
}
