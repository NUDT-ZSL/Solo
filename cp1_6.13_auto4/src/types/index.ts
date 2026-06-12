export type BlockMaterial = 'wood' | 'stone' | 'iron';

export interface BlockMaterialConfig {
  density: number;
  friction: number;
  restitution: number;
  color: string;
  label: string;
}

export interface BlockData {
  id: string;
  material: BlockMaterial;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  angle: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface HistoryAction {
  type: 'add' | 'remove';
  block: BlockData;
}

export type SimulationState = 'idle' | 'simulating' | 'stable';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GRID_COLS = 20;
export const GRID_ROWS = 15;
export const CELL_SIZE = 40;

export const GRAVITY = 1;
export const FRICTION = 0.8;
export const RESTITUTION = 0.2;

export const STABLE_FRAME_THRESHOLD = 100;
export const STABLE_TIMESTAMP_DELTA = 0.1;

export const PARTICLES_PER_COLLISION = 10;
export const PARTICLE_LIFETIME = 300;

export const MAX_HISTORY_SIZE = 20;

export const MATERIAL_CONFIGS: Record<BlockMaterial, BlockMaterialConfig> = {
  wood: { density: 0.6, friction: 0.8, restitution: 0.2, color: '#8B4513', label: '木块' },
  stone: { density: 2.0, friction: 0.8, restitution: 0.2, color: '#808080', label: '石块' },
  iron: { density: 3.5, friction: 0.8, restitution: 0.2, color: '#333333', label: '铁块' },
};
