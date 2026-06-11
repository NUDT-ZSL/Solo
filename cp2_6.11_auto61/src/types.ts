export interface AudioFeature {
  timestamp: number;
  bpm: number;
  energy: number;
  lowFreq: number;
  midFreq: number;
  highFreq: number;
  dominant: 'low' | 'mid' | 'high';
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
}

export const PRESET_CONFIGS: Record<ParticlePreset, ParticleConfig> = {
  nebula: {
    spawnType: 'random',
    colorTendency: {
      low: '#8B0000',
      mid: '#FF8C00',
      high: '#00BFFF',
    },
    baseSpeed: 1.5,
    sizeMultiplier: 1,
  },
  volcano: {
    spawnType: 'center',
    colorTendency: {
      low: '#8B0000',
      mid: '#FF4500',
      high: '#FFD700',
    },
    baseSpeed: 3,
    sizeMultiplier: 1.2,
  },
  deepSea: {
    spawnType: 'bottom',
    colorTendency: {
      low: '#000080',
      mid: '#00CED1',
      high: '#E0FFFF',
    },
    baseSpeed: 1,
    sizeMultiplier: 0.8,
  },
};

export const BG_COLORS = {
  low: '#2E0A0A',
  mid: '#3E2723',
  high: '#0A0A2E',
};
