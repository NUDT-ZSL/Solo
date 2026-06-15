export const CPK_COLORS: Record<string, number> = {
  H: 0xffffff,
  C: 0x909090,
  N: 0x3050f8,
  O: 0xff0d0d,
  F: 0x90e050,
  Cl: 0x1ff01f,
  Br: 0xa62929,
  I: 0x940094,
  S: 0xffff30,
  P: 0xff8000,
  B: 0xffb5b5,
  Li: 0xcc80ff,
  Na: 0xab5cf2,
  K: 0x8f40d4,
  Ca: 0x3dff00,
  Fe: 0xe06633,
  Cu: 0xc88033,
  Zn: 0x7d80b0
};

export const ATOMIC_RADII: Record<string, number> = {
  H: 0.31,
  C: 0.76,
  N: 0.71,
  O: 0.66,
  F: 0.57,
  Cl: 1.02,
  Br: 1.20,
  I: 1.39,
  S: 1.05,
  P: 1.07,
  B: 0.84,
  Li: 1.52,
  Na: 1.54,
  K: 2.27,
  Ca: 1.97,
  Fe: 1.26,
  Cu: 1.28,
  Zn: 1.34
};

export const ATOMIC_WEIGHTS: Record<string, number> = {
  H: 1.008,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  F: 18.998,
  Cl: 35.45,
  Br: 79.904,
  I: 126.904,
  S: 32.06,
  P: 30.974,
  B: 10.81,
  Li: 6.94,
  Na: 22.99,
  K: 39.098,
  Ca: 40.078,
  Fe: 55.845,
  Cu: 63.546,
  Zn: 65.38
};

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255
  };
}

export function rgbToHex(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getAtomColor(element: string): number {
  return CPK_COLORS[element] || 0x808080;
}

export function getAtomRadius(element: string): number {
  return (ATOMIC_RADII[element] || 0.8) * 0.4;
}

export function getAtomicWeight(element: string): number {
  return ATOMIC_WEIGHTS[element] || 0;
}

export function generateRandomOffset(scale: number = 1): { x: number; y: number; z: number } {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    x: scale * Math.sin(phi) * Math.cos(theta),
    y: scale * Math.sin(phi) * Math.sin(theta),
    z: scale * Math.cos(phi)
  };
}
