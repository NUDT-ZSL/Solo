import * as THREE from 'three';

export interface BuildingData {
  id: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  isGreen?: boolean;
}

export interface SimulationParams {
  density: number;
  maxHeight: number;
  greenRate: number;
  dayOfYear: number;
  latitude: number;
}

export interface SolarResult {
  buildingId: number;
  faceIndex: number;
  intensity: number;
}

export interface WindParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  lifespan: number;
  trail: THREE.Vector3[];
}

export type SimulationStatus = 'idle' | 'solar_calculating' | 'solar_done' | 'wind_calculating' | 'wind_done';
