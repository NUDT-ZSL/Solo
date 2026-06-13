import type { PlantStage } from '../art/Visuals';

export { type PlantStage };

export interface PlantState {
  stage: PlantStage;
  growthPercent: number;
  waterLevel: number;
  lightLevel: number;
  stemDrawHeight: number;
  targetStemHeight: number;
  leafCount: number;
  leafUnfurlProgress: number[];
  bloomProgress: number;
  saturation: number;
  mood: number;
  isWatering: boolean;
  waterTimer: number;
}

const STAGE_THRESHOLDS: { stage: PlantStage; minGrowth: number }[] = [
  { stage: 'seed', minGrowth: 0 },
  { stage: 'sprout', minGrowth: 20 },
  { stage: 'stem', minGrowth: 40 },
  { stage: 'bud', minGrowth: 65 },
  { stage: 'bloom', minGrowth: 90 },
];

const TARGET_STEM_HEIGHTS: Record<PlantStage, number> = {
  seed: 0,
  sprout: 30,
  stem: 80,
  bud: 120,
  bloom: 150,
};

const TARGET_LEAF_COUNTS: Record<PlantStage, number> = {
  seed: 0,
  sprout: 1,
  stem: 3,
  bud: 4,
  bloom: 4,
};

const MOOD_COLORS: Record<PlantStage, string> = {
  seed: '#9ca3af',
  sprout: '#86efac',
  stem: '#4ade80',
  bud: '#a78bfa',
  bloom: '#f472b6',
};

export { STAGE_THRESHOLDS, TARGET_STEM_HEIGHTS, TARGET_LEAF_COUNTS, MOOD_COLORS };

export function getStage(growth: number): PlantStage {
  let result: PlantStage = 'seed';
  for (const t of STAGE_THRESHOLDS) {
    if (growth >= t.minGrowth) result = t.stage;
  }
  return result;
}

export function createInitialPlantState(): PlantState {
  return {
    stage: 'seed',
    growthPercent: 0,
    waterLevel: 50,
    lightLevel: 50,
    stemDrawHeight: 0,
    targetStemHeight: 0,
    leafCount: 0,
    leafUnfurlProgress: [0, 0, 0, 0],
    bloomProgress: 0,
    saturation: 0.8,
    mood: 0,
    isWatering: false,
    waterTimer: 0,
  };
}

export function updatePlantState(state: PlantState, dt: number): PlantStage | null {
  const lightFactor = state.lightLevel / 100;
  const waterFactor = state.waterLevel / 100;

  if (state.isWatering) {
    state.waterTimer -= dt;
    if (state.waterTimer <= 0) {
      state.isWatering = false;
      state.waterTimer = 0;
    }
  }

  if (state.waterLevel > 0) {
    state.waterLevel = Math.max(0, state.waterLevel - 0.005 * (dt / 16.67));
  }

  if (state.growthPercent < 100) {
    const growthRate = 0.1 * (0.3 + lightFactor * 0.4 + waterFactor * 0.3);
    state.growthPercent = Math.min(100, state.growthPercent + growthRate);
  }

  const newStage = getStage(state.growthPercent);
  let stageChanged: PlantStage | null = null;
  if (newStage !== state.stage) {
    stageChanged = newStage;
    state.stage = newStage;
  }

  state.targetStemHeight = TARGET_STEM_HEIGHTS[state.stage];
  const stemDiff = state.targetStemHeight - state.stemDrawHeight;
  const stemGrowSpeed = 2;
  if (Math.abs(stemDiff) > 0.5) {
    state.stemDrawHeight += Math.sign(stemDiff) * Math.min(stemGrowSpeed, Math.abs(stemDiff));
  } else {
    state.stemDrawHeight = state.targetStemHeight;
  }

  const targetLeaf = TARGET_LEAF_COUNTS[state.stage];
  if (state.leafCount < targetLeaf) {
    state.leafCount = Math.min(targetLeaf, state.leafCount + 0.008 * (dt / 16.67));
  }

  for (let i = 0; i < 4; i++) {
    const targetUnfurl = i < Math.floor(state.leafCount) ? 1 : 0;
    const currentUnfurl = state.leafUnfurlProgress[i] ?? 0;
    if (currentUnfurl < targetUnfurl) {
      state.leafUnfurlProgress[i] = Math.min(targetUnfurl, currentUnfurl + 0.006 * (dt / 16.67));
    }
  }

  if (state.stage === 'bloom') {
    state.bloomProgress = Math.min(1, state.bloomProgress + 0.005 * (dt / 16.67));
  }

  const targetSat = state.isWatering ? 1.0 : 0.8;
  state.saturation += (targetSat - state.saturation) * 0.02;

  const stageIdx = STAGE_THRESHOLDS.findIndex(s => s.stage === state.stage);
  state.mood = stageIdx / (STAGE_THRESHOLDS.length - 1);

  return stageChanged;
}

export function applyWater(state: PlantState): boolean {
  state.waterLevel = Math.min(100, state.waterLevel + 20);
  state.isWatering = true;
  state.waterTimer = 2000;
  if (state.growthPercent < 100) {
    state.growthPercent = Math.min(100, state.growthPercent + 2);
  }
  return true;
}
