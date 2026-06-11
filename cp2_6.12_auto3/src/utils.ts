import * as THREE from 'three';

export interface ColorTheme {
  name: string;
  colorStart: THREE.Color;
  colorMid: THREE.Color;
  colorEnd: THREE.Color;
}

export const colorThemes: ColorTheme[] = [
  {
    name: '银河蓝紫',
    colorStart: new THREE.Color(0x0a0a2e),
    colorMid: new THREE.Color(0x6b21a8),
    colorEnd: new THREE.Color(0xff6b35)
  },
  {
    name: '极光绿紫',
    colorStart: new THREE.Color(0x064e3b),
    colorMid: new THREE.Color(0x7c3aed),
    colorEnd: new THREE.Color(0x10b981)
  },
  {
    name: '火焰红金',
    colorStart: new THREE.Color(0x7f1d1d),
    colorMid: new THREE.Color(0xf59e0b),
    colorEnd: new THREE.Color(0xfef08a)
  }
];

export function lerpColor(
  a: THREE.Color,
  b: THREE.Color,
  t: number
): THREE.Color {
  const result = new THREE.Color();
  result.r = a.r + (b.r - a.r) * t;
  result.g = a.g + (b.g - a.g) * t;
  result.b = a.b + (b.b - a.b) * t;
  return result;
}

export function getGradientColor(
  t: number,
  theme: ColorTheme
): THREE.Color {
  if (t < 0.5) {
    return lerpColor(theme.colorStart, theme.colorMid, t * 2);
  } else {
    return lerpColor(theme.colorMid, theme.colorEnd, (t - 0.5) * 2);
  }
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function generateNebulaPosition(
  index: number,
  total: number
): THREE.Vector3 {
  const radius = randomRange(5, 50);
  const theta = randomRange(0, Math.PI * 2);
  const phi = Math.acos(randomRange(-1, 1));

  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
  const z = radius * Math.cos(phi);

  const spiralOffset = theta * 2 + radius * 0.1;
  const sx = Math.cos(spiralOffset) * radius * 0.3;
  const sy = randomRange(-10, 10);
  const sz = Math.sin(spiralOffset) * radius * 0.3;

  return new THREE.Vector3(x + sx, y + sy, z + sz);
}

export function smoothDamp(
  current: number,
  target: number,
  smoothTime: number,
  deltaTime: number
): number {
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  return current + (target - current) * exp;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
