export type EventType = 'sowing' | 'watering' | 'fertilizing' | 'harvesting' | 'germination' | 'thinning';

export interface GrowthStage {
  stage: 'seed' | 'germination' | 'growth' | 'flowering' | 'fruiting' | 'harvested';
  label: string;
}

export interface Seed {
  id: string;
  name: string;
  variety: string;
  description: string;
  provider: string;
  availableCount: number;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  growthDays: {
    germination: number;
    thinning: number;
    growth: number;
    flowering: number;
    fruiting: number;
    total: number;
  };
  optimalSeason: string[];
}

export interface ClaimedSeed {
  id: string;
  seedId: string;
  userId: string;
  claimedAt: string;
  schedule: PlantSchedule;
  seed: Seed;
}

export interface PlantSchedule {
  sowingDate: string;
  germinationDate: string;
  thinningDate: string;
  growthStartDate: string;
  floweringDate: string;
  fruitingDate: string;
  harvestDate: string;
}

export interface GardenEvent {
  id: string;
  claimedSeedId: string;
  seedId: string;
  userId: string;
  date: string;
  type: EventType;
  note: string;
  completed: boolean;
}

export interface Reminder {
  id: string;
  claimedSeedId: string;
  seedName: string;
  eventType: EventType;
  eventTypeLabel: string;
  date: string;
  daysAway: number;
  read: boolean;
}

export interface ClaimRequest {
  seedId: string;
  userId: string;
}

export interface ClaimResponse {
  success: boolean;
  claimedSeed?: ClaimedSeed;
  message?: string;
}

export interface AddEventRequest {
  claimedSeedId: string;
  seedId: string;
  userId: string;
  date: string;
  type: EventType;
  note: string;
  completed?: boolean;
}

export interface GardenData {
  claimedSeeds: ClaimedSeed[];
  events: GardenEvent[];
}

export interface StageCount {
  seed: number;
  germination: number;
  growth: number;
  flowering: number;
  fruiting: number;
  harvested: number;
}
