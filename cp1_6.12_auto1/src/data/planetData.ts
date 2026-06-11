export interface PlanetConfig {
  name: string;
  nameCN: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  color: number;
  emissive?: number;
  emissiveIntensity?: number;
  hasRing?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  ringColor?: number;
  stripeColors?: number[];
  orbitPeriodDays: number;
  rotationPeriodHours: number;
  realDiameterKm: number;
}

export const SUN_CONFIG = {
  name: 'Sun',
  nameCN: '太阳',
  radius: 5,
  color: 0xffaa33,
  emissive: 0xff8800,
  emissiveIntensity: 1.5,
  realDiameterKm: 1392700
};

export const PLANET_CONFIGS: PlanetConfig[] = [
  {
    name: 'Mercury',
    nameCN: '水星',
    radius: 0.4,
    orbitRadius: 10,
    orbitSpeed: 4.15,
    rotationSpeed: 0.01,
    color: 0x8c7853,
    orbitPeriodDays: 88,
    rotationPeriodHours: 1407.6,
    realDiameterKm: 4879
  },
  {
    name: 'Venus',
    nameCN: '金星',
    radius: 0.9,
    orbitRadius: 14,
    orbitSpeed: 1.62,
    rotationSpeed: -0.005,
    color: 0xffc649,
    emissive: 0xff6600,
    emissiveIntensity: 0.05,
    orbitPeriodDays: 225,
    rotationPeriodHours: 5832.5,
    realDiameterKm: 12104
  },
  {
    name: 'Earth',
    nameCN: '地球',
    radius: 1,
    orbitRadius: 19,
    orbitSpeed: 1,
    rotationSpeed: 0.1,
    color: 0x2266ff,
    stripeColors: [0x2266ff, 0x33aa55, 0x4488ff],
    orbitPeriodDays: 365,
    rotationPeriodHours: 23.9,
    realDiameterKm: 12742
  },
  {
    name: 'Mars',
    nameCN: '火星',
    radius: 0.55,
    orbitRadius: 25,
    orbitSpeed: 0.53,
    rotationSpeed: 0.095,
    color: 0xcc4422,
    orbitPeriodDays: 687,
    rotationPeriodHours: 24.6,
    realDiameterKm: 6779
  },
  {
    name: 'Jupiter',
    nameCN: '木星',
    radius: 2.8,
    orbitRadius: 36,
    orbitSpeed: 0.084,
    rotationSpeed: 0.22,
    color: 0xd4a574,
    stripeColors: [0xd4a574, 0x8b6914, 0xc9a06a, 0xa67c52, 0xb8865a],
    orbitPeriodDays: 4333,
    rotationPeriodHours: 9.9,
    realDiameterKm: 139820
  },
  {
    name: 'Saturn',
    nameCN: '土星',
    radius: 2.4,
    orbitRadius: 48,
    orbitSpeed: 0.034,
    rotationSpeed: 0.2,
    color: 0xfad5a5,
    stripeColors: [0xfad5a5, 0xd4a574, 0xe8c498],
    hasRing: true,
    ringInnerRadius: 3,
    ringOuterRadius: 5,
    ringColor: 0xc9a86c,
    orbitPeriodDays: 10759,
    rotationPeriodHours: 10.7,
    realDiameterKm: 116460
  },
  {
    name: 'Uranus',
    nameCN: '天王星',
    radius: 1.6,
    orbitRadius: 58,
    orbitSpeed: 0.012,
    rotationSpeed: -0.14,
    color: 0x7de3f4,
    orbitPeriodDays: 30687,
    rotationPeriodHours: 17.2,
    realDiameterKm: 50724
  },
  {
    name: 'Neptune',
    nameCN: '海王星',
    radius: 1.5,
    orbitRadius: 68,
    orbitSpeed: 0.006,
    rotationSpeed: 0.15,
    color: 0x4166f5,
    orbitPeriodDays: 60190,
    rotationPeriodHours: 16.1,
    realDiameterKm: 49244
  }
];

export const SCENE_CONFIG = {
  starCount: 2000,
  starRadius: 500,
  orbitSegments: 128,
  defaultCameraPosition: { x: 0, y: 60, z: 120 },
  defaultCameraTarget: { x: 0, y: 0, z: 0 }
};
