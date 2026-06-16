export type MaterialType = 'sand' | 'clay' | 'rock' | 'snow';

export interface MaterialConfig {
  color: string;
  hardness: number;
  name: string;
}

export interface VertexData {
  id: number;
  position: [number, number, number];
  originalPosition: [number, number, number];
  normal: [number, number, number];
  displacement: number;
  color: [number, number, number];
  alive: boolean;
}

export interface ErosionStats {
  totalVertices: number;
  removedVertices: number;
  maxErosionDepth: number;
  erosionProgress: number;
}

export interface MeshUpdateData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  gridCellErosionRatio: Map<string, number>;
}

export interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  life: number;
  maxLife: number;
  size: number;
}

export const MATERIALS: Record<MaterialType, MaterialConfig> = {
  sand: { color: '#e8d5b7', hardness: 0.8, name: '沙子' },
  clay: { color: '#8b7d6b', hardness: 0.5, name: '黏土' },
  rock: { color: '#696969', hardness: 0.2, name: '岩石' },
  snow: { color: '#f0f8ff', hardness: 0.9, name: '雪' }
};

export const EROSION_THRESHOLD = 0.01;
export const MAX_DISPLACEMENT = 0.5;
export const CUBE_SIZE = 4;
export const VERTEX_COUNT_TARGET = 3000;
export const GRID_SPACING = 0.5;
export const GRID_CELL_THRESHOLD = 0.3;
