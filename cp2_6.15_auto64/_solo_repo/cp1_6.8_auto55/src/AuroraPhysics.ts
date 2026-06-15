export interface AuroraParams {
  flowSpeed: number;
  particleDensity: number;
  distortion: number;
}

export const DEFAULT_PARAMS: AuroraParams = {
  flowSpeed: 1.0,
  particleDensity: 1.0,
  distortion: 1.0,
};

const GRAD3: number[][] = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

const PERM: number[] = [];
const PERM_MOD12: number[] = [];
{
  const p: number[] = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
    PERM_MOD12[i] = PERM[i] % 12;
  }
}

function dot3(g: number[], x: number, y: number, z: number): number {
  return g[0] * x + g[1] * y + g[2] * z;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

export function noise3D(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;
  return lerp(
    lerp(
      lerp(dot3(GRAD3[PERM_MOD12[AA]], x, y, z), dot3(GRAD3[PERM_MOD12[BA]], x - 1, y, z), u),
      lerp(dot3(GRAD3[PERM_MOD12[AB]], x, y - 1, z), dot3(GRAD3[PERM_MOD12[BB]], x - 1, y - 1, z), u),
      v
    ),
    lerp(
      lerp(dot3(GRAD3[PERM_MOD12[AA + 1]], x, y, z - 1), dot3(GRAD3[PERM_MOD12[BA + 1]], x - 1, y, z - 1), u),
      lerp(dot3(GRAD3[PERM_MOD12[AB + 1]], x, y - 1, z - 1), dot3(GRAD3[PERM_MOD12[BB + 1]], x - 1, y - 1, z - 1), u),
      v
    ),
    w
  );
}

export function fbm(x: number, y: number, z: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value / maxValue;
}

export function computeAuroraY(
  x: number,
  z: number,
  time: number,
  params: AuroraParams
): number {
  const flowOffset = time * params.flowSpeed * 0.3;
  const n1 = fbm(x * 0.15 + flowOffset, z * 0.1, time * 0.2, 3);
  const n2 = fbm(x * 0.3 + flowOffset * 0.5, z * 0.2, time * 0.15 + 100, 2);
  const baseY = 8.0 + n1 * 4.0 * params.distortion;
  const detail = n2 * 1.5 * params.distortion;
  return baseY + detail;
}

export function computeAuroraIntensity(
  x: number,
  z: number,
  time: number,
  params: AuroraParams
): number {
  const flicker = fbm(x * 0.5, z * 0.3, time * 0.8 + 200, 3);
  const pulse = Math.sin(time * 1.5 + x * 0.2) * 0.15 + 0.85;
  return Math.max(0, Math.min(1, (0.5 + flicker * 0.5) * pulse));
}

export function computeAuroraColor(
  x: number,
  time: number,
  intensity: number
): [number, number, number] {
  const cycle = (Math.sin(time * 0.3 + x * 0.1) + 1) * 0.5;
  const r = lerp(0.0, 1.0, cycle) * intensity;
  const g = lerp(1.0, 0.3, cycle) * intensity;
  const b = lerp(0.66, 1.0, cycle) * intensity;
  return [r, g, b];
}

export function computeColorTemperature(intensity: number, time: number): number {
  return 4000 + intensity * 3000 + Math.sin(time * 0.5) * 500;
}

export function computeWaveFrequency(time: number, params: AuroraParams): number {
  return 0.5 + params.flowSpeed * 0.3 + Math.sin(time * 0.7) * 0.1;
}

export interface BurstState {
  active: boolean;
  originX: number;
  originY: number;
  originZ: number;
  startTime: number;
  strength: number;
}

export function computeBurstDisplacement(
  x: number,
  y: number,
  z: number,
  burst: BurstState,
  time: number
): { dx: number; dy: number; dz: number; intensity: number } {
  if (!burst.active) return { dx: 0, dy: 0, dz: 0, intensity: 0 };
  const elapsed = time - burst.startTime;
  const duration = 2.0;
  if (elapsed > duration) return { dx: 0, dy: 0, dz: 0, intensity: 0 };
  const progress = elapsed / duration;
  const decay = 1.0 - progress;
  const dx = x - burst.originX;
  const dy = y - burst.originY;
  const dz = z - burst.originZ;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 0.001) return { dx: 0, dy: 0, dz: 0, intensity: decay };
  const radius = elapsed * 8.0;
  const ringDist = Math.abs(dist - radius);
  const influence = Math.exp(-ringDist * 0.5) * decay * burst.strength;
  const dirX = dx / dist;
  const dirY = dy / dist;
  const dirZ = dz / dist;
  const expandForce = influence * 3.0 * Math.exp(-ringDist * 0.3);
  return {
    dx: dirX * expandForce,
    dy: dirY * expandForce * 0.5,
    dz: dirZ * expandForce,
    intensity: influence,
  };
}
