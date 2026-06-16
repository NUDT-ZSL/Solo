import type { ElevationPoint, PaceEntry } from '../types';

const ASCEND_PENALTY_PER_10M = 3;
const DESCEND_BONUS_PER_10M = 1.5;
const MARATHON_DISTANCE = 42.2;

const getElevationChange = (
  elevationData: ElevationPoint[],
  startKm: number,
  endKm: number
): number => {
  if (elevationData.length < 2) return 0;

  const findElevation = (km: number): number => {
    for (let i = 0; i < elevationData.length - 1; i++) {
      const curr = elevationData[i];
      const next = elevationData[i + 1];
      if (km >= curr.distance && km <= next.distance) {
        if (next.distance === curr.distance) return curr.elevation;
        const ratio = (km - curr.distance) / (next.distance - curr.distance);
        return curr.elevation + ratio * (next.elevation - curr.elevation);
      }
    }
    if (km <= elevationData[0].distance) return elevationData[0].elevation;
    return elevationData[elevationData.length - 1].elevation;
  };

  const startElevation = findElevation(startKm);
  const endElevation = findElevation(endKm);
  return endElevation - startElevation;
};

export const validateElevationData = (data: unknown): ElevationPoint[] | null => {
  try {
    if (!Array.isArray(data)) {
      return null;
    }
    const validated: ElevationPoint[] = [];
    for (const item of data) {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof item.distance !== 'number' ||
        typeof item.elevation !== 'number' ||
        isNaN(item.distance) ||
        isNaN(item.elevation)
      ) {
        return null;
      }
      validated.push({
        distance: item.distance,
        elevation: item.elevation
      });
    }
    if (validated.length < 2) {
      return null;
    }
    return validated;
  } catch {
    return null;
  }
};

export const generateElevationData = (): ElevationPoint[] => {
  const data: ElevationPoint[] = [];
  for (let i = 0; i <= 42; i++) {
    let elevation = 20;
    if (i >= 5 && i < 15) {
      elevation = 20 + (i - 5) * 8;
    } else if (i >= 15 && i < 25) {
      elevation = 100 - (i - 15) * 6;
    } else if (i >= 30 && i < 38) {
      elevation = 40 + (i - 30) * 5;
    } else if (i >= 38) {
      elevation = 80 - (i - 38) * 10;
    }
    data.push({
      distance: i,
      elevation: Math.max(0, elevation)
    });
  }
  data.push({ distance: 42.2, elevation: 5 });
  return data;
};

export const calculatePacePlan = (
  targetTimeSeconds: number,
  elevationData: ElevationPoint[]
): PaceEntry[] => {
  const paceEntries: PaceEntry[] = [];
  const basePace = targetTimeSeconds / MARATHON_DISTANCE;
  let cumulativeTime = 0;

  for (let km = 1; km <= 42; km++) {
    const elevationChange = getElevationChange(elevationData, km - 1, km);
    const adjustment =
      elevationChange > 0
        ? (elevationChange / 10) * ASCEND_PENALTY_PER_10M
        : (elevationChange / 10) * DESCEND_BONUS_PER_10M;

    const recommendedPace = basePace + adjustment;
    cumulativeTime += recommendedPace;

    paceEntries.push({
      km,
      recommendedPace: Math.round(recommendedPace * 10) / 10,
      actualPace: Math.round(recommendedPace * 10) / 10,
      cumulativeTime: Math.round(cumulativeTime * 10) / 10,
      elevationChange: Math.round(elevationChange * 10) / 10
    });
  }

  const lastKm = 0.2;
  const lastElevationChange = getElevationChange(elevationData, 42, 42.2);
  const lastAdjustment =
    lastElevationChange > 0
      ? (lastElevationChange / 10) * ASCEND_PENALTY_PER_10M * lastKm
      : (lastElevationChange / 10) * DESCEND_BONUS_PER_10M * lastKm;

  const lastPace = (basePace + lastAdjustment) * lastKm;
  cumulativeTime += lastPace;

  paceEntries.push({
    km: 42.2,
    recommendedPace: Math.round((lastPace / lastKm) * 10) / 10,
    actualPace: Math.round((lastPace / lastKm) * 10) / 10,
    cumulativeTime: Math.round(cumulativeTime * 10) / 10,
    elevationChange: Math.round(lastElevationChange * 10) / 10
  });

  return paceEntries;
};

export const getPaceColor = (pace: number, minPace: number, maxPace: number): string => {
  if (maxPace === minPace) return '#d1fae5';
  const ratio = (pace - minPace) / (maxPace - minPace);
  const r = Math.round(209 + ratio * (254 - 209));
  const g = Math.round(250 - ratio * (250 - 226));
  const b = Math.round(229 - ratio * (229 - 226));
  return `rgb(${r}, ${g}, ${b})`;
};
