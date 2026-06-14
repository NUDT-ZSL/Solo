export enum GestureType {
  FIST = 'fist',
  OPEN = 'open',
  VICTORY = 'victory',
  NONE = 'none'
}

export enum ParticleShape {
  SPHERE = 'sphere',
  CLOUD = 'cloud',
  GALAXY = 'galaxy'
}

export interface FingerTip {
  x: number;
  y: number;
  z: number;
}

export interface GestureData {
  fingerTips: FingerTip[];
  gestureType: GestureType;
  timestamp: number;
}

export interface AudioEnergy {
  lowFreq: number;
  highFreq: number;
  isBurst: boolean;
  timestamp: number;
}

export interface ParticleData {
  positions: Float32Array;
  targetPositions: Float32Array;
  startPositions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  baseSizes: Float32Array;
  velocities: Float32Array;
  phases: Float32Array;
}

export type EventCallback = (data?: any) => void;

export interface EventMap {
  gestureData: GestureData;
  audioEnergy: AudioEnergy;
  togglePlay: boolean;
  switchShape: ParticleShape;
}
