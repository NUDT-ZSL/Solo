const CROP_GROWTH_DAYS: Record<string, number> = {
  tomato: 60,
  cucumber: 50,
  carrot: 70,
  lettuce: 30,
  eggplant: 80,
  chili: 90,
  番茄: 60,
  黄瓜: 50,
  胡萝卜: 70,
  生菜: 30,
  茄子: 80,
  辣椒: 90,
};

const WATER_COOLDOWN_SECONDS = 36 * 60 * 60;

export const WATER_COOLDOWN_MS = WATER_COOLDOWN_SECONDS * 1000;

export function msToSeconds(ms: number): number {
  return Math.ceil(ms / 1000);
}

export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

export function getCropGrowthDays(cropType: string): number {
  return CROP_GROWTH_DAYS[cropType] ?? 60;
}

export function getWaterCooldown(lastWateredAt: string | null): number {
  if (lastWateredAt === null) return 0;
  const elapsed = Math.floor((Date.now() - new Date(lastWateredAt).getTime()) / 1000);
  const remaining = WATER_COOLDOWN_SECONDS - elapsed;
  return remaining > 0 ? remaining : 0;
}

export function getHarvestCountdown(plantDate: string, cropType: string): { days: number; hours: number } {
  const growthDays = getCropGrowthDays(cropType);
  const plantTime = new Date(plantDate).getTime();
  const harvestTime = plantTime + growthDays * 24 * 60 * 60 * 1000;
  const diff = harvestTime - Date.now();
  if (diff <= 0) return { days: 0, hours: 0 };
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { days, hours };
}

export function calculatePoints(action: 'water' | 'log' | 'harvest'): number {
  const points: Record<string, number> = { water: 10, log: 20, harvest: 50 };
  return points[action];
}

export function getUserLevel(points: number): {
  level: number
  progress: number
  color: string
  gradient: string
  progressGradient: string
} {
  const level = Math.floor(points / 100) + 1
  const progress = (points % 100) / 100

  const gradientStops: Array<[number, string]> = [
    [0, '#8BC34A'],
    [0.33, '#7CB342'],
    [0.5, '#66BB6A'],
    [0.66, '#4CAF50'],
    [0.83, '#43A047'],
    [1, '#388E3C'],
  ]

  const color = getColorAtProgress(points, gradientStops)

  const fullGradient =
    'linear-gradient(90deg, #8BC34A 0%, #7CB342 20%, #66BB6A 40%, #4CAF50 60%, #43A047 80%, #388E3C 100%)'

  const progressGradient = buildProgressGradient(points, gradientStops)

  return { level, progress, color, gradient: fullGradient, progressGradient }
}

function getColorAtProgress(
  points: number,
  stops: Array<[number, string]>,
): string {
  const normalizedPoints = Math.min(1, points / 500)
  for (let i = 0; i < stops.length - 1; i++) {
    const [pos1, color1] = stops[i]
    const [pos2, color2] = stops[i + 1]
    if (normalizedPoints >= pos1 && normalizedPoints <= pos2) {
      const t = (normalizedPoints - pos1) / (pos2 - pos1)
      return interpolateColor(color1, color2, t)
    }
  }
  return stops[stops.length - 1][1]
}

function buildProgressGradient(
  points: number,
  stops: Array<[number, string]>,
): string {
  const normalizedPoints = Math.min(1, points / 500)
  if (normalizedPoints <= 0) return '#8BC34A'
  const filtered = stops.filter(([pos]) => pos <= normalizedPoints)
  const lastColor = getColorAtProgress(points, stops)
  const segments = filtered.map(
    ([pos, color]) => `${color} ${(pos / normalizedPoints) * 100}%`,
  )
  if (!filtered.length || filtered[filtered.length - 1][0] < normalizedPoints) {
    segments.push(`${lastColor} 100%`)
  }
  return `linear-gradient(90deg, ${segments.join(', ')})`
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function interpolateColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

export function formatCooldown(seconds: number): string {
  if (seconds <= 0) return '可以浇水';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}时${minutes}分后可浇`;
}

export function getRegionStatus(
  lastWateredAt: string | null,
  expectedHarvestDate: string,
): 'normal' | 'nearHarvest' | 'needsWater' {
  if (getWaterCooldown(lastWateredAt) === 0) return 'needsWater';
  const daysToHarvest = (new Date(expectedHarvestDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysToHarvest > 0 && daysToHarvest <= 7) return 'nearHarvest';
  return 'normal';
}
