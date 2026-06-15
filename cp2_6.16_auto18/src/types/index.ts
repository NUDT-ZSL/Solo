export interface Plant {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  description: string;
  light: string;
  water: string;
  temperature: string;
  soil: string;
  location: string;
  addedAt: string;
}

export interface CareEvent {
  id: string;
  plantId: string;
  type: 'water' | 'fertilize' | 'prune' | 'repot';
  date: string;
  note?: string;
}

export interface GrowthRecord {
  id: string;
  plantId: string;
  date: string;
  image: string;
  note: string;
}

export interface Reminder {
  id: string;
  plantId: string;
  plantName: string;
  type: 'water' | 'fertilize' | 'prune' | 'repot';
  date: string;
  description: string;
  completed: boolean;
}

export interface IdentifyResult {
  id: string;
  name: string;
  confidence: number;
  image: string;
  light: string;
  water: string;
  temperature: string;
  soil: string;
  description: string;
  scientificName: string;
}

export interface PlantData {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  description: string;
  keywords: string[];
  light: string;
  water: string;
  temperature: string;
  soil: string;
  colorProfile?: number[][];
  tags?: string[];
}

export const EVENT_COLORS: Record<string, string> = {
  water: '#4fc3f7',
  fertilize: '#81c784',
  prune: '#ffb74d',
  repot: '#ba68c8',
};

export const EVENT_NAMES: Record<string, string> = {
  water: '浇水',
  fertilize: '施肥',
  prune: '修剪',
  repot: '换盆',
};
