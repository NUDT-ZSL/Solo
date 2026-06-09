export interface EarthquakePoint {
  id: number;
  lat: number;
  lon: number;
  depth: number;
  magnitude: number;
  timestamp: number;
}

export const EARTH_RADIUS_KM = 6371;
export const SCENE_GLOBE_RADIUS = 2;
export const ONE_DAY_MS = 86400000;
export const THIRTY_MIN_MS = 1800000;
export const CHAIN_RADIUS_KM = 200;

export const magnitudeToRadius = (m: number): number => {
  return 0.05 + (m - 4) * (0.25 / 5);
};

export const depthToOpacity = (d: number): number => {
  const clamped = Math.min(300, Math.max(0, d));
  return 0.9 - (clamped / 300) * 0.6;
};

export const magnitudeToColor = (m: number, brighten: number = 0): [number, number, number] => {
  const t = Math.min(1, Math.max(0, (m - 4) / 5));
  const r0 = 0, g0 = 1, b0 = 0.533;
  const r1 = 1, g1 = 0, b1 = 0.267;
  let r = r0 + (r1 - r0) * t;
  let g = g0 + (g1 - g0) * t;
  let b = b0 + (b1 - b0) * t;
  if (brighten > 0) {
    r = Math.min(1, r + brighten);
    g = Math.min(1, g + brighten);
    b = Math.min(1, b + brighten);
  }
  return [r, g, b];
};

export const latLonToVec3 = (lat: number, lon: number, radius: number, depthKm: number = 0): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const depthRatio = (depthKm / 300) * (SCENE_GLOBE_RADIUS * 0.15);
  const r = radius - depthRatio;
  const x = -r * Math.sin(phi) * Math.cos(theta);
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);
  return [x, y, z];
};

export const surfaceDistanceRad = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const formatTime = (msOffset: number): string => {
  const totalSec = Math.floor(msOffset / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

interface Zone {
  latC: number; lonC: number; latR: number; lonR: number; depthBias: number; magBias: number; weight: number;
}

const ZONES: Zone[] = [
  { latC: 35, lonC: 140, latR: 15, lonR: 20, depthBias: 50, magBias: 0.8, weight: 15 },
  { latC: -5, lonC: 125, latR: 8, lonR: 20, depthBias: 80, magBias: 0.5, weight: 10 },
  { latC: 5, lonC: -75, latR: 10, lonR: 20, depthBias: 100, magBias: 0.6, weight: 10 },
  { latC: -35, lonC: -72, latR: 15, lonR: 15, depthBias: 70, magBias: 0.7, weight: 8 },
  { latC: 38, lonC: 45, latR: 8, lonR: 15, depthBias: 30, magBias: 0.4, weight: 6 },
  { latC: 60, lonC: -150, latR: 15, lonR: 25, depthBias: 40, magBias: 0.5, weight: 7 },
  { latC: 15, lonC: -95, latR: 10, lonR: 15, depthBias: 20, magBias: 0.3, weight: 4 },
  { latC: 0, lonC: 30, latR: 10, lonR: 25, depthBias: 15, magBias: 0.2, weight: 3 },
  { latC: 50, lonC: 100, latR: 12, lonR: 18, depthBias: 25, magBias: 0.4, weight: 5 },
  { latC: -20, lonC: 175, latR: 10, lonR: 15, depthBias: 60, magBias: 0.6, weight: 5 },
];

const pickZone = (rand: () => number): Zone => {
  const total = ZONES.reduce((s, z) => s + z.weight, 0);
  let r = rand() * total;
  for (const z of ZONES) {
    if (r < z.weight) return z;
    r -= z.weight;
  }
  return ZONES[0];
};

export const generateEarthquakes = (count: number = 70, seed: number = 42): EarthquakePoint[] => {
  const rand = seededRandom(seed);
  const result: EarthquakePoint[] = [];
  const base = Date.now();

  for (let i = 0; i < count; i++) {
    const zone = pickZone(rand);
    const lat = zone.latC + (rand() * 2 - 1) * zone.latR;
    const lon = zone.lonC + (rand() * 2 - 1) * zone.lonR;
    const depth = Math.min(300, Math.max(0, zone.depthBias + rand() * 150 - 40));
    const magRaw = 4 + rand() * 5 * 0.75 + zone.magBias;
    const magnitude = Math.min(9, Math.max(4, magRaw));
    const dayFrac = Math.pow(rand(), 0.75);
    const hourBias = (rand() < 0.55) ? (8 + rand() * 10) / 24 : rand();
    const tFrac = Math.min(0.999, (dayFrac * 0.7 + hourBias * 0.3));
    const timestamp = base + tFrac * ONE_DAY_MS;

    result.push({ id: i, lat, lon, depth, magnitude, timestamp });
  }
  return result.sort((a, b) => a.timestamp - b.timestamp);
};

export const passesMagnitudeFilter = (m: number, filter: 'all' | '4-6' | '6-8' | '8-9'): boolean => {
  switch (filter) {
    case 'all': return true;
    case '4-6': return m >= 4 && m < 6;
    case '6-8': return m >= 6 && m < 8;
    case '8-9': return m >= 8 && m <= 9;
  }
};
