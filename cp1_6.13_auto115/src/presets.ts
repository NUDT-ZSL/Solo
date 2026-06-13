import { RGB } from '../engine/Particle';
import { EngineConfig } from '../engine/ParticleEngine';

export interface Preset {
  _id?: string;
  name: string;
  colors: RGB[];
  sizeRange: [number, number];
  speedRange: [number, number];
  chargeBias: number;
  createdAt?: number;
}

export const builtInPresets: Preset[] = [
  {
    name: '萤火虫',
    colors: [
      { r: 253, g: 224, b: 71 },
      { r: 190, g: 242, b: 100 },
      { r: 163, g: 230, b: 53 },
      { r: 250, g: 204, b: 21 },
    ],
    sizeRange: [1.5, 3.5],
    speedRange: [0.5, 2],
    chargeBias: 0.2,
  },
  {
    name: '极光',
    colors: [
      { r: 34, g: 211, b: 238 },
      { r: 45, g: 212, b: 191 },
      { r: 167, g: 139, b: 250 },
      { r: 236, g: 72, b: 153 },
    ],
    sizeRange: [2, 5],
    speedRange: [1, 3.5],
    chargeBias: -0.3,
  },
  {
    name: '熔岩',
    colors: [
      { r: 239, g: 68, b: 68 },
      { r: 251, g: 146, b: 60 },
      { r: 250, g: 204, b: 21 },
      { r: 220, g: 38, b: 38 },
    ],
    sizeRange: [2.5, 6],
    speedRange: [1.5, 4],
    chargeBias: 0.5,
  },
];

export function presetToConfig(preset: Preset): EngineConfig {
  return {
    colors: preset.colors,
    sizeRange: preset.sizeRange,
    speedRange: preset.speedRange,
    chargeBias: preset.chargeBias,
  };
}
