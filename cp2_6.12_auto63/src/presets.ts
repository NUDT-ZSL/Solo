import { LSystemParams } from './lsystem';

export interface Preset {
  name: string;
  params: LSystemParams;
}

interface PresetWithDefaults extends LSystemParams {
  axiom: string;
  rules: Record<string, string>;
}

const presets: Preset[] = [
  {
    name: '毕达哥拉斯树',
    params: {
      iterations: 6,
      trunkLength: 20,
      branchAngle: 45,
      lengthDecay: 0.7,
      leafDensity: 0.5,
      axiom: 'F',
      rules: { F: 'F[+F]F[-F][F]' },
    } as PresetWithDefaults,
  },
  {
    name: '龙形曲线',
    params: {
      iterations: 8,
      trunkLength: 2,
      branchAngle: 90,
      lengthDecay: 1,
      leafDensity: 0,
      axiom: 'FX',
      rules: {
        X: 'X+YF+',
        Y: '-FX-Y',
      },
    } as PresetWithDefaults,
  },
  {
    name: '科赫雪花',
    params: {
      iterations: 5,
      trunkLength: 3,
      branchAngle: 60,
      lengthDecay: 1,
      leafDensity: 0,
      axiom: 'F++F++F',
      rules: { F: 'F-F++F-F' },
    } as PresetWithDefaults,
  },
  {
    name: '蕨类植物',
    params: {
      iterations: 6,
      trunkLength: 15,
      branchAngle: 25,
      lengthDecay: 0.8,
      leafDensity: 0.8,
      axiom: 'X',
      rules: {
        X: 'F-[[X]+X]+F[+FX]-X',
        F: 'FF',
      },
    } as PresetWithDefaults,
  },
  {
    name: '灌木',
    params: {
      iterations: 5,
      trunkLength: 18,
      branchAngle: 25,
      lengthDecay: 0.75,
      leafDensity: 0.6,
      axiom: 'F',
      rules: { F: 'F[+F]F[-F][+F[-F]]' },
    } as PresetWithDefaults,
  },
  {
    name: '仙人掌',
    params: {
      iterations: 4,
      trunkLength: 22,
      branchAngle: 15,
      lengthDecay: 0.7,
      leafDensity: 0.3,
      axiom: 'F',
      rules: { F: 'FF[+F[-F]]F[-F[+F]]' },
    } as PresetWithDefaults,
  },
];

export function getPreset(name: string): Preset | undefined {
  return presets.find((p) => p.name === name);
}

export function getAllPresets(): Preset[] {
  return presets.map((p) => ({ ...p, params: { ...p.params } }));
}
