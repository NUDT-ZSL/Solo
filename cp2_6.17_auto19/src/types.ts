export interface Genes {
  rootStrength: number;
  stemToughness: number;
  leafArea: number;
  flowerColor: number;
}

export interface MutationDeltas {
  rootStrength: number;
  stemToughness: number;
  leafArea: number;
  flowerColor: number;
}

export interface Plant {
  id: string;
  genes: Genes;
  generation: number;
  growthProgress: number;
  x: number;
  y: number;
  parentId1: string | null;
  parentId2: string | null;
  hybridCycle: number | null;
  mutationDeltas: MutationDeltas | null;
  isSelected: boolean;
  health: number;
  grayLevel: number;
}

export type ThreatType = 'DROUGHT' | 'PEST' | 'WIND' | 'FROST';

export interface EnvironmentThreat {
  type: ThreatType;
  startTime: number;
  duration: number;
  intensity: number;
}

export interface LineageNode {
  plantId: string;
  genes: Genes;
  generation: number;
  hybridCycle: number | null;
  mutationDeltas: MutationDeltas | null;
  children: LineageNode[];
}

export interface Achievement {
  id: string;
  name: string;
  unlocked: boolean;
  unlockedAt: number;
}

export const GENE_MIN = 0;
export const GENE_MAX = 255;
export const THREAT_THRESHOLD = 40;
export const ACHIEVEMENT_THRESHOLD = 70;
export const BASE_CYCLE_DURATION = 5000;
export const THREAT_DURATION = 15000;
export const MUTATION_STD = 0.1;
