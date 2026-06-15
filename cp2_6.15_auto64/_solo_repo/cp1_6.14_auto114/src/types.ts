import * as THREE from 'three';

export interface OrbitParams {
  semiMajorAxis: number;
  eccentricity: number;
  orbitalPeriod: number;
  initialPhase: number;
}

export interface PlanetData {
  name: string;
  nameCn: string;
  radius: number;
  color: string;
  orbitParams: OrbitParams;
}

export interface PlanetPosition {
  name: string;
  position: THREE.Vector3;
}

export interface TimeUpdatePayload {
  elapsed: number;
  formatted: string;
}

export interface EventMap {
  update: PlanetPosition[];
  timeUpdate: TimeUpdatePayload;
}
