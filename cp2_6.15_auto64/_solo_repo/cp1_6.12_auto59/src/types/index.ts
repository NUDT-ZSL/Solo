export interface Point3D {
  x: number;
  y: number;
  z: number;
  density: number;
}

export interface VoxelData {
  index: number;
  i: number;
  j: number;
  k: number;
  centerX: number;
  centerY: number;
  centerZ: number;
  density: number;
  pointCount: number;
  neighbors: number[];
}

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface CutPlaneState {
  enabled: boolean;
  position: number;
  axis: 'x' | 'y' | 'z';
}

export type DensityMappingMode = 'linear' | 'log' | 'exponential';

export interface ProbeResult {
  centerX: number;
  centerY: number;
  centerZ: number;
  voxels: VoxelData[];
  minDensity: number;
  maxDensity: number;
  avgDensity: number;
}

export interface AppEvents {
  'csv:loaded': Point3D[];
  'csv:error': string;
  'voxel:built': void;
  'cutplane:changed': CutPlaneState[];
  'probe:result': ProbeResult;
  'settings:changed': void;
}
