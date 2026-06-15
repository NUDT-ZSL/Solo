export type NodeType = 'stem' | 'branch' | 'leaf' | 'bud' | 'flower' | 'fruit' | 'cotyledon';

export type Stage = 0 | 1 | 2 | 3;

export interface PlantNode {
  id: string;
  type: NodeType;
  parentId: string | null;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  length: number;
  radius: number;
  color: string;
  targetColor: string;
  growthProgress: number;
  stage: Stage;
  children: string[];
  isCut: boolean;
  isWilting: boolean;
  wiltingProgress: number;
  createdAt: number;
  cutAt?: number;
  detachPosition?: [number, number, number];
  detachVelocity?: [number, number, number];
  detachRotation?: [number, number, number];
}

export interface FallingParticle {
  id: string;
  type: 'leaf' | 'fragment';
  position: [number, number, number];
  velocity: [number, number, number];
  rotation: [number, number, number];
  rotationSpeed: [number, number, number];
  scale: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
}

export interface CutEffect {
  id: string;
  position: [number, number, number];
  createdAt: number;
  duration: number;
}

export interface PlantStats {
  height: number;
  leafCount: number;
  budCount: number;
  fruitCount: number;
}

export interface EnvironmentParams {
  light: number;
  water: number;
  temperature: number;
}

export const STAGE_NAMES: Record<Stage, string> = {
  0: '发芽期',
  1: '幼苗期',
  2: '成长期',
  3: '开花结果期'
};

export const COLORS = {
  LIGHT_GREEN: '#8fbc8f',
  DARK_GREEN: '#2e8b57',
  BROWN: '#8b4513',
  PINK: '#ffb6c1',
  RED: '#ff4444',
  SOIL_BROWN: '#654321',
  GROUND_GREEN: '#7cb342',
  SKY_BLUE: '#87ceeb',
  WHITE: '#ffffff'
} as const;
