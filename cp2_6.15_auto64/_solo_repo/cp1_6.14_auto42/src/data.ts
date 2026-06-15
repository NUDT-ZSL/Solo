export interface YearlyData {
  year: number;
  cumulativeVolume: number;
  annualRate: number;
  elevationChange: number;
}

export interface GlacierRegion {
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  yearlyData: YearlyData[];
}

interface RegionTemplate {
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  baseRate: number;
  acceleration: number;
  noiseScale: number;
}

const REGION_TEMPLATES: RegionTemplate[] = [
  { name: '阿拉斯加', latitude: 61.0, longitude: -149.0, elevation: 2500, baseRate: 0.8, acceleration: 0.018, noiseScale: 0.15 },
  { name: '青藏高原', latitude: 33.0, longitude: 88.0, elevation: 5200, baseRate: 0.6, acceleration: 0.022, noiseScale: 0.12 },
  { name: '安第斯山脉', latitude: -13.0, longitude: -72.0, elevation: 4800, baseRate: 0.5, acceleration: 0.020, noiseScale: 0.13 },
  { name: '阿尔卑斯', latitude: 46.5, longitude: 8.0, elevation: 3200, baseRate: 0.7, acceleration: 0.016, noiseScale: 0.10 },
  { name: '冰岛', latitude: 64.5, longitude: -18.5, elevation: 1800, baseRate: 0.9, acceleration: 0.014, noiseScale: 0.18 },
  { name: '帕米尔', latitude: 38.5, longitude: 73.0, elevation: 4600, baseRate: 0.55, acceleration: 0.025, noiseScale: 0.11 },
  { name: '斯堪的纳维亚', latitude: 62.0, longitude: 12.0, elevation: 2100, baseRate: 0.65, acceleration: 0.013, noiseScale: 0.14 },
  { name: '喜马拉雅', latitude: 28.0, longitude: 86.0, elevation: 5800, baseRate: 0.5, acceleration: 0.028, noiseScale: 0.09 },
  { name: '落基山脉', latitude: 51.0, longitude: -117.0, elevation: 3000, baseRate: 0.45, acceleration: 0.015, noiseScale: 0.16 },
  { name: '高加索', latitude: 43.0, longitude: 42.0, elevation: 3800, baseRate: 0.6, acceleration: 0.017, noiseScale: 0.12 },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateGlacierData(): GlacierRegion[] {
  const startYear = 1980;
  const endYear = 2030;
  const maxVolume = 10;

  return REGION_TEMPLATES.map((template, regionIndex) => {
    const rng = seededRandom(regionIndex * 1000 + 42);
    const yearlyData: YearlyData[] = [];
    let cumulativeVolume = 0;

    for (let year = startYear; year <= endYear; year++) {
      const yearsSinceStart = year - startYear;
      const trendFactor = 1 + template.acceleration * yearsSinceStart;
      const noise = 1 + (rng() - 0.5) * 2 * template.noiseScale;
      const annualRate = template.baseRate * trendFactor * noise;
      cumulativeVolume += annualRate;

      const cappedVolume = Math.min(cumulativeVolume, maxVolume);
      const elevationChange = -(cumulativeVolume * 2.5 + rng() * 0.5);

      yearlyData.push({
        year,
        cumulativeVolume: Math.round(cappedVolume * 100) / 100,
        annualRate: Math.round(annualRate * 100) / 100,
        elevationChange: Math.round(elevationChange * 10) / 10,
      });
    }

    return {
      name: template.name,
      latitude: template.latitude,
      longitude: template.longitude,
      elevation: template.elevation,
      yearlyData,
    };
  });
}

export const START_YEAR = 1980;
export const END_YEAR = 2030;
export const MAX_VOLUME = 10;
export const MAX_BAR_HEIGHT = 8;
