export interface AudioFeature {
  timestamp: number;
  bpm: number;
  energy: number;
  lowFreq: number;
  midFreq: number;
  highFreq: number;
  dominant: 'low' | 'mid' | 'high';
  beatIntensity: number;
  isOnset: boolean;
  bpmConfidence: number;
}

export type ParticlePreset = 'nebula' | 'volcano' | 'deepSea';

export interface ParticleConfig {
  spawnType: 'random' | 'center' | 'bottom';
  colorTendency: {
    low: string;
    mid: string;
    high: string;
  };
  baseSpeed: number;
  sizeMultiplier: number;
  vortexStrength?: number;
}

export const PRESET_CONFIGS: Record<ParticlePreset, ParticleConfig> = {
  nebula: {
    spawnType: 'random',
    colorTendency: {
      low: '#8B0000',
      mid: '#FF8C00',
      high: '#00BFFF',
    },
    baseSpeed: 1.2,
    sizeMultiplier: 1,
  },
  volcano: {
    spawnType: 'center',
    colorTendency: {
      low: '#8B0000',
      mid: '#FF4500',
      high: '#FFD700',
    },
    baseSpeed: 3.5,
    sizeMultiplier: 1.3,
  },
  deepSea: {
    spawnType: 'bottom',
    colorTendency: {
      low: '#000080',
      mid: '#00CED1',
      high: '#E0FFFF',
    },
    baseSpeed: 1.5,
    sizeMultiplier: 0.85,
    vortexStrength: 0.3,
  },
};

export const BG_COLORS = {
  low: '#2E0A0A',
  mid: '#3E2723',
  high: '#0A0A2E',
};

export interface SavedParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface CanvasSnapshotState {
  particles: SavedParticleState[];
  backgroundColor: { r: number; g: number; b: number };
  overlayOpacity: number;
  globalCompositeOperation: GlobalCompositeOperation;
  preset: ParticlePreset;
  timestamp: number;
}
