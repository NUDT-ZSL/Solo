export interface FlavorProfile {
  acidity: number;
  sweetness: number;
  bitterness: number;
  body: number;
  aroma: number;
}

export interface RoastCurvePoint {
  time: number;
  temperature: number;
}

export interface BatchRecord {
  id: string;
  batchNumber: string;
  beanName: string;
  roastDate: string;
  roastDuration: number;
  roastTemperature: number;
  flavorProfile: FlavorProfile;
  curvePoints: RoastCurvePoint[];
  createdAt: number;
}

export const FLAVOR_KEYS: (keyof FlavorProfile)[] = [
  'acidity',
  'sweetness',
  'bitterness',
  'body',
  'aroma',
];

export const FLAVOR_LABELS: Record<keyof FlavorProfile, string> = {
  acidity: '酸度',
  sweetness: '甜度',
  bitterness: '苦度',
  body: '醇厚度',
  aroma: '香气',
};

export const FLAVOR_COLORS: Record<keyof FlavorProfile, string> = {
  acidity: '#FF6B6B',
  sweetness: '#FFD93D',
  bitterness: '#6B4226',
  body: '#8B4513',
  aroma: '#98D8C8',
};

export const DEFAULT_FLAVOR_PROFILE: FlavorProfile = {
  acidity: 50,
  sweetness: 50,
  bitterness: 50,
  body: 50,
  aroma: 50,
};

export function generateRoastCurve(
  duration: number,
  peakTemp: number
): RoastCurvePoint[] {
  const points: RoastCurvePoint[] = [];
  const step = Math.max(0.5, duration / 20);
  for (let t = 0; t <= duration; t += step) {
    const progress = t / duration;
    let temp: number;
    if (progress < 0.15) {
      temp = peakTemp * 0.3 * (progress / 0.15);
    } else if (progress < 0.5) {
      const p = (progress - 0.15) / 0.35;
      temp = peakTemp * 0.3 + peakTemp * 0.6 * p;
    } else if (progress < 0.8) {
      const p = (progress - 0.5) / 0.3;
      temp = peakTemp * 0.9 + peakTemp * 0.1 * p;
    } else {
      const p = (progress - 0.8) / 0.2;
      temp = peakTemp - peakTemp * 0.05 * p;
    }
    points.push({ time: Math.round(t * 10) / 10, temperature: Math.round(temp) });
  }
  const last = points[points.length - 1];
  if (last.time < duration) {
    points.push({ time: duration, temperature: Math.round(peakTemp * 0.95) });
  }
  return points;
}
