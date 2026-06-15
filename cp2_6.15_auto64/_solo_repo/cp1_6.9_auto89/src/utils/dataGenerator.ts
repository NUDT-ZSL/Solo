import { HighDimPoint } from '../types';

const NUM_POINTS = 500;
const NUM_FEATURES = 8;
const NUM_CATEGORIES = 5;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function gaussianRandom(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

export function generateHighDimData(): HighDimPoint[] {
  const rand = seededRandom(42);
  const points: HighDimPoint[] = [];

  const categoryCenters: number[][] = [];
  for (let c = 0; c < NUM_CATEGORIES; c++) {
    const center: number[] = [];
    for (let f = 0; f < NUM_FEATURES; f++) {
      center.push((rand() - 0.5) * 12);
    }
    categoryCenters.push(center);
  }

  for (let i = 0; i < NUM_POINTS; i++) {
    const category = i % NUM_CATEGORIES;
    const center = categoryCenters[category];
    const features: number[] = [];
    const spread = 1.2 + rand() * 0.8;

    for (let f = 0; f < NUM_FEATURES; f++) {
      features.push(center[f] + gaussianRandom(rand) * spread);
    }

    points.push({
      id: i,
      features,
      category,
    });
  }

  return points;
}
