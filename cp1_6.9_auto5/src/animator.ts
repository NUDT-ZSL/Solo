import type { AnimationConfig } from './types';

export interface OffsetResult {
  dx: number;
  dy: number;
}

const hashId = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) / 2147483648;
};

const seededNoise = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const computeLayerOffset = (
  config: AnimationConfig,
  layerId: string,
  timeSeconds: number
): OffsetResult => {
  if (!config.enabled || config.type === 'none') {
    return { dx: 0, dy: 0 };
  }

  const phase = hashId(layerId) * Math.PI * 2;
  const { amplitude, frequency } = config;
  const omega = 2 * Math.PI * frequency;

  if (config.type === 'sine') {
    return {
      dx: amplitude * Math.sin(omega * timeSeconds + phase),
      dy: amplitude * Math.cos(omega * timeSeconds + phase * 1.3),
    };
  }

  if (config.type === 'noise') {
    const t = timeSeconds * frequency;
    const tFloor = Math.floor(t);
    const tFrac = t - tFloor;
    const smooth = tFrac * tFrac * (3 - 2 * tFrac);

    const seedBase = Math.floor(hashId(layerId) * 10000);
    const nx1 = seededNoise(seedBase + tFloor);
    const nx2 = seededNoise(seedBase + tFloor + 1);
    const ny1 = seededNoise(seedBase + tFloor + 1000);
    const ny2 = seededNoise(seedBase + tFloor + 1001);

    const nx = nx1 + (nx2 - nx1) * smooth;
    const ny = ny1 + (ny2 - ny1) * smooth;

    return {
      dx: (nx * 2 - 1) * amplitude,
      dy: (ny * 2 - 1) * amplitude,
    };
  }

  return { dx: 0, dy: 0 };
};
