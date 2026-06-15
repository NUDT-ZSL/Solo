export type FractalAlgorithm = 'mandelbulb' | 'julia3d';

export interface FractalParams {
  algorithm: FractalAlgorithm;
  iterations: number;
  power: number;
  escapeRadius: number;
  resolution: number;
}

export interface VoxelData {
  positions: Float32Array;
  colors: Float32Array;
  densities: Float32Array;
  count: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export type SliceAxis = 'x' | 'y' | 'z';

export interface SliceConfig {
  axis: SliceAxis;
  position: number;
  enabled: boolean;
}

export interface SphereHole {
  id: string;
  center: { x: number; y: number; z: number };
  radius: number;
}

export interface CameraSettings {
  autoRotate: boolean;
  autoRotateSpeed: number;
}

export interface Julia3DParams {
  cX: number;
  cY: number;
  cZ: number;
  cW: number;
}

export const DEFAULT_FRACTAL_PARAMS: FractalParams = {
  algorithm: 'mandelbulb',
  iterations: 10,
  power: 8,
  escapeRadius: 2,
  resolution: 80,
};

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  autoRotate: false,
  autoRotateSpeed: 1,
};

export const DEFAULT_JULIA_PARAMS: Julia3DParams = {
  cX: -0.2,
  cY: 0.4,
  cZ: -0.4,
  cW: 0.0,
};
