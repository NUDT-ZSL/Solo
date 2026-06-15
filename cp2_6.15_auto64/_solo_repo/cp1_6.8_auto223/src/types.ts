import { Vector3, Color } from 'three';

export interface AppConfig {
  starSize: number;
  burstSpeed: number;
}

export interface StarParticleData {
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: Color;
  isAlive: boolean;
  trail: TrailData;
}

export interface TrailData {
  points: Vector3[];
  color: Color;
  opacity: number;
  isBursting: boolean;
}

export interface BurstParticleData {
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: Color;
  angle: number;
  spiralRadius: number;
  isAlive: boolean;
}

export interface BackgroundStarData {
  position: Vector3;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export interface InteractionState {
  isDragging: boolean;
  isEmitting: boolean;
  lastEmitPosition: Vector3 | null;
  mouseDown: boolean;
  mouseMoved: boolean;
  mouseDownTime: number;
}
