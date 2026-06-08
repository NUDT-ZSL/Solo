import * as THREE from 'three';

export enum SpectralType {
  O = 'O',
  B = 'B',
  A = 'A',
  F = 'F',
  G = 'G',
  K = 'K',
  M = 'M',
}

export const SPECTRAL_CONFIG: Record<
  SpectralType,
  { color: THREE.Color; brightness: number; label: string; weight: number }
> = {
  [SpectralType.O]: {
    color: new THREE.Color(0.6, 0.7, 1.0),
    brightness: 1.0,
    label: 'O型 蓝巨星',
    weight: 0.02,
  },
  [SpectralType.B]: {
    color: new THREE.Color(0.7, 0.8, 1.0),
    brightness: 0.9,
    label: 'B型 蓝白巨星',
    weight: 0.05,
  },
  [SpectralType.A]: {
    color: new THREE.Color(0.9, 0.9, 1.0),
    brightness: 0.8,
    label: 'A型 白色星',
    weight: 0.1,
  },
  [SpectralType.F]: {
    color: new THREE.Color(1.0, 0.95, 0.85),
    brightness: 0.7,
    label: 'F型 黄白色星',
    weight: 0.15,
  },
  [SpectralType.G]: {
    color: new THREE.Color(1.0, 0.9, 0.6),
    brightness: 0.6,
    label: 'G型 黄色星',
    weight: 0.2,
  },
  [SpectralType.K]: {
    color: new THREE.Color(1.0, 0.7, 0.4),
    brightness: 0.5,
    label: 'K型 橙色星',
    weight: 0.25,
  },
  [SpectralType.M]: {
    color: new THREE.Color(1.0, 0.5, 0.3),
    brightness: 0.4,
    label: 'M型 红矮星',
    weight: 0.23,
  },
};

const SPECTRAL_ENTRIES = Object.entries(SPECTRAL_CONFIG);
const TOTAL_WEIGHT = SPECTRAL_ENTRIES.reduce((s, [, c]) => s + c.weight, 0);

export function randomSpectralType(): SpectralType {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const [type, config] of SPECTRAL_ENTRIES) {
    r -= config.weight;
    if (r <= 0) return type as SpectralType;
  }
  return SpectralType.M;
}

export function getSpectralColor(
  type: SpectralType,
  shift: number
): THREE.Color {
  const base = SPECTRAL_CONFIG[type].color.clone();
  const shifted = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  hsl.h = (hsl.h + shift) % 1;
  if (hsl.h < 0) hsl.h += 1;
  shifted.setHSL(hsl.h, hsl.s, hsl.l);
  return shifted;
}

export interface StarParticleData {
  spectralType: SpectralType;
  angle: number;
  radius: number;
  height: number;
  angularSpeed: number;
  breathPhase: number;
  breathSpeed: number;
  size: number;
}

export function createStarParticle(
  spiralIndex: number,
  spiralCount: number
): StarParticleData {
  const spectralType = randomSpectralType();
  const spiralAngle = (spiralIndex / spiralCount) * Math.PI * 8;
  const radiusVariance = (Math.random() - 0.5) * 30;
  const baseRadius = 15 + Math.random() * 40;
  return {
    spectralType,
    angle: spiralAngle + (Math.random() - 0.5) * 0.8,
    radius: baseRadius + radiusVariance,
    height: (Math.random() - 0.5) * 60,
    angularSpeed: (0.05 + Math.random() * 0.1) * (Math.random() > 0.5 ? 1 : -1),
    breathPhase: Math.random() * Math.PI * 2,
    breathSpeed: 0.5 + Math.random() * 1.5,
    size: 0.3 + SPECTRAL_CONFIG[spectralType].brightness * 1.2,
  };
}

export function updateStarParticlePosition(
  data: StarParticleData,
  flowSpeed: number,
  deltaTime: number
): { x: number; y: number; z: number; currentSize: number } {
  data.angle += data.angularSpeed * flowSpeed * deltaTime;
  const x = data.radius * Math.cos(data.angle);
  const z = data.radius * Math.sin(data.angle);
  const breathScale =
    1 + 0.3 * Math.sin(data.breathPhase + performance.now() * 0.001 * data.breathSpeed);
  const currentSize = data.size * breathScale;
  return { x, y: data.height, z, currentSize };
}
