export interface GeologyLayer {
  id: number;
  name: string;
  depth: number;
  height: number;
  color: string;
  lithology: string;
}

export interface ParticleData {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface QueryResult {
  x: number;
  y: number;
  z: number;
  speed: number;
  direction: {
    horizontal: number;
    vertical: number;
  };
  lithology: string;
  layerId: number;
}

export interface VectorFieldSample {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
