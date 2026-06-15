import * as THREE from 'three';

export type LifeStage = 'main_sequence' | 'red_giant' | 'white_dwarf';

export interface StarTypeData {
  id: string;
  name: string;
  description: string;
  temperature: number;
  mass: number;
  luminosity: number;
  baseRadius: number;
  colors: Record<LifeStage, THREE.Color>;
  particleCount: number;
  pulsationPeriod: number;
  pulsationAmplitude: number;
  rotationSpeed: number;
  flickerIntensity: number;
  dustColor: THREE.Color;
  dustCount: number;
}

export const STAR_TYPES: StarTypeData[] = [
  {
    id: 'red_dwarf',
    name: '红矮星',
    description: '宇宙中最常见的恒星，体积小、温度低、寿命极长，可达数万亿年。',
    temperature: 3000,
    mass: 0.1,
    luminosity: 0.001,
    baseRadius: 0.4,
    colors: {
      main_sequence: new THREE.Color(0.6, 0.1, 0.05),
      red_giant: new THREE.Color(0.7, 0.15, 0.05),
      white_dwarf: new THREE.Color(0.5, 0.4, 0.35),
    },
    particleCount: 120,
    pulsationPeriod: 4.0,
    pulsationAmplitude: 0.02,
    rotationSpeed: 0.3,
    flickerIntensity: 0.1,
    dustColor: new THREE.Color(0.5, 0.1, 0.05),
    dustCount: 40,
  },
  {
    id: 'yellow_star',
    name: '黄矮星',
    description: '与太阳类似的恒星，稳定燃烧氢燃料，是寻找宜居行星的理想目标。',
    temperature: 5800,
    mass: 1.0,
    luminosity: 1.0,
    baseRadius: 0.7,
    colors: {
      main_sequence: new THREE.Color(1.0, 0.85, 0.3),
      red_giant: new THREE.Color(0.9, 0.3, 0.1),
      white_dwarf: new THREE.Color(0.8, 0.8, 0.9),
    },
    particleCount: 160,
    pulsationPeriod: 5.0,
    pulsationAmplitude: 0.03,
    rotationSpeed: 0.25,
    flickerIntensity: 0.15,
    dustColor: new THREE.Color(0.9, 0.7, 0.2),
    dustCount: 50,
  },
  {
    id: 'blue_white_star',
    name: '蓝白星',
    description: '高温高亮的恒星，表面温度超过10000K，释放强烈的紫外辐射。',
    temperature: 12000,
    mass: 3.0,
    luminosity: 50,
    baseRadius: 1.0,
    colors: {
      main_sequence: new THREE.Color(0.5, 0.7, 1.0),
      red_giant: new THREE.Color(0.8, 0.4, 0.3),
      white_dwarf: new THREE.Color(0.9, 0.9, 1.0),
    },
    particleCount: 200,
    pulsationPeriod: 6.5,
    pulsationAmplitude: 0.04,
    rotationSpeed: 0.2,
    flickerIntensity: 0.2,
    dustColor: new THREE.Color(0.4, 0.6, 1.0),
    dustCount: 60,
  },
  {
    id: 'red_giant_star',
    name: '红巨星',
    description: '恒星演化晚期的膨胀阶段，体积可达太阳数百倍，表面温度却更低。',
    temperature: 4000,
    mass: 1.5,
    luminosity: 100,
    baseRadius: 1.6,
    colors: {
      main_sequence: new THREE.Color(0.9, 0.3, 0.1),
      red_giant: new THREE.Color(0.95, 0.2, 0.05),
      white_dwarf: new THREE.Color(0.7, 0.6, 0.5),
    },
    particleCount: 250,
    pulsationPeriod: 8.0,
    pulsationAmplitude: 0.06,
    rotationSpeed: 0.12,
    flickerIntensity: 0.12,
    dustColor: new THREE.Color(0.8, 0.2, 0.05),
    dustCount: 70,
  },
  {
    id: 'blue_supergiant',
    name: '蓝超巨星',
    description: '极其稀有而壮观的恒星，质量可达太阳数十倍，寿命仅数百万年，终将超新星爆发。',
    temperature: 30000,
    mass: 20,
    luminosity: 100000,
    baseRadius: 2.0,
    colors: {
      main_sequence: new THREE.Color(0.3, 0.5, 1.0),
      red_giant: new THREE.Color(0.7, 0.3, 0.5),
      white_dwarf: new THREE.Color(1.0, 1.0, 1.0),
    },
    particleCount: 300,
    pulsationPeriod: 10.0,
    pulsationAmplitude: 0.08,
    rotationSpeed: 0.08,
    flickerIntensity: 0.35,
    dustColor: new THREE.Color(0.3, 0.4, 1.0),
    dustCount: 80,
  },
];

export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  main_sequence: '主序星',
  red_giant: '红巨星',
  white_dwarf: '白矮星',
};

export const STAR_POSITIONS: THREE.Vector3[] = [
  new THREE.Vector3(-6, 0, -4),
  new THREE.Vector3(-3, 2, 3),
  new THREE.Vector3(0, -1, -6),
  new THREE.Vector3(4, 1, 2),
  new THREE.Vector3(7, -0.5, -2),
];
