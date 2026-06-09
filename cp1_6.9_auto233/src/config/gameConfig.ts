import type { CreatureType } from '../entities/ShadowCreature';
import type { ElementType } from './elements';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export interface SlotConfig {
  index: number;
  x: number;
  y: number;
  neighbors: number[];
}

export const SLOTS: SlotConfig[] = [
  { index: 0, x: 260, y: 210, neighbors: [1, 2, 3] },
  { index: 1, x: 400, y: 160, neighbors: [0, 2, 4] },
  { index: 2, x: 540, y: 210, neighbors: [0, 1, 5] },
  { index: 3, x: 330, y: 330, neighbors: [0, 4, 5] },
  { index: 4, x: 470, y: 330, neighbors: [1, 3, 5] },
  { index: 5, x: 400, y: 430, neighbors: [2, 3, 4] }
];

export const PATH_POINTS: { x: number; y: number }[] = [
  { x: -30, y: 500 },
  { x: 80, y: 470 },
  { x: 140, y: 380 },
  { x: 100, y: 280 },
  { x: 180, y: 180 },
  { x: 320, y: 100 },
  { x: 500, y: 90 },
  { x: 660, y: 140 },
  { x: 720, y: 260 },
  { x: 680, y: 400 },
  { x: 760, y: 480 },
  { x: 830, y: 500 }
];

export const FLYING_PATH: { x: number; y: number }[] = [
  { x: -30, y: 500 },
  { x: 830, y: 100 }
];

export interface WaveConfig {
  waveNumber: number;
  totalCount: number;
  spawnInterval: number;
  composition: { type: CreatureType; count: number }[];
}

export const WAVES: WaveConfig[] = [
  { waveNumber: 1, totalCount: 3, spawnInterval: 1200, composition: [{ type: 'normal', count: 3 }] },
  { waveNumber: 2, totalCount: 5, spawnInterval: 1100, composition: [{ type: 'normal', count: 5 }] },
  { waveNumber: 3, totalCount: 6, spawnInterval: 1000, composition: [{ type: 'normal', count: 5 }, { type: 'elite', count: 1 }] },
  { waveNumber: 4, totalCount: 7, spawnInterval: 950, composition: [{ type: 'normal', count: 5 }, { type: 'flying', count: 2 }] },
  { waveNumber: 5, totalCount: 9, spawnInterval: 900, composition: [{ type: 'normal', count: 6 }, { type: 'elite', count: 2 }, { type: 'flying', count: 1 }] },
  { waveNumber: 6, totalCount: 10, spawnInterval: 850, composition: [{ type: 'normal', count: 6 }, { type: 'elite', count: 2 }, { type: 'flying', count: 2 }] },
  { waveNumber: 7, totalCount: 11, spawnInterval: 800, composition: [{ type: 'normal', count: 7 }, { type: 'elite', count: 2 }, { type: 'flying', count: 2 }] },
  { waveNumber: 8, totalCount: 12, spawnInterval: 750, composition: [{ type: 'normal', count: 7 }, { type: 'elite', count: 3 }, { type: 'flying', count: 2 }] },
  { waveNumber: 9, totalCount: 14, spawnInterval: 700, composition: [{ type: 'normal', count: 8 }, { type: 'elite', count: 3 }, { type: 'flying', count: 3 }] },
  { waveNumber: 10, totalCount: 15, spawnInterval: 650, composition: [{ type: 'normal', count: 8 }, { type: 'elite', count: 4 }, { type: 'flying', count: 3 }] }
];

export interface CreatureStats {
  hp: number;
  speed: number;
  color: number;
  size: number;
  reward: number;
}

export const CREATURE_STATS: Record<CreatureType, CreatureStats> = {
  normal: { hp: 30, speed: 40, color: 0x44ff44, size: 14, reward: 1 },
  elite: { hp: 120, speed: 22, color: 0xaa44ff, size: 20, reward: 3 },
  flying: { hp: 18, speed: 55, color: 0x4488ff, size: 12, reward: 2 }
};

export interface GuardianStats {
  baseDamage: number;
  baseAttackSpeed: number;
  range: number;
  hp: number;
}

export const GUARDIAN_STATS: Record<ElementType, GuardianStats> = {
  fire: { baseDamage: 12, baseAttackSpeed: 1.4, range: 100, hp: 100 },
  water: { baseDamage: 8, baseAttackSpeed: 1.8, range: 100, hp: 100 },
  wind: { baseDamage: 9, baseAttackSpeed: 2.0, range: 100, hp: 100 },
  earth: { baseDamage: 18, baseAttackSpeed: 1.0, range: 100, hp: 100 }
};

export const INITIAL_CARD_COUNTS: Record<ElementType, number> = {
  fire: 5,
  water: 5,
  wind: 5,
  earth: 5
};

export const INITIAL_LIVES = 10;
export const TOTAL_WAVES = 10;
export const WAVE_INTERVAL_MS = 15000;
export const WAVE_BREAK_MS = 3000;

export const MAX_PARTICLES = 300;
export const MAX_PROJECTILES_PER_FRAME = 15;
export const FUSION_ATTACK_SPEED_MULTIPLIER = 1.3;
export const FUSION_DAMAGE_MULTIPLIER = 1.2;
