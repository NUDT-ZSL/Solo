const CROP_GROWTH_DAYS: Record<string, number> = {
  tomato: 60,
  cucumber: 50,
  carrot: 70,
  lettuce: 30,
  eggplant: 80,
  chili: 90,
};

const WATER_COOLDOWN_SECONDS = 129600;

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

export function getUserLevel(points: number): { level: number; progress: number; color: string } {
  const level = Math.floor(points / 100) + 1;
  const progress = (points % 100) / 100;
  let color: string;
  if (level <= 2) color = '#8BC34A';
  else if (level <= 4) color = '#4CAF50';
  else color = '#388E3C';
  return { level, progress, color };
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
