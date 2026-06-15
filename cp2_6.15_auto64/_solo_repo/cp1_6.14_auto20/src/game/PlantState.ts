export type PlantStage = 'seed' | 'sprout' | 'stem' | 'bud' | 'bloom';

export interface PlantState {
  stage: PlantStage;
  growthPercent: number;
  waterLevel: number;
  lightLevel: number;
  stemHeight: number;
  leafCount: number;
  leafUnfurl: number[];
  bloomProgress: number;
  saturation: number;
  mood: number;
  isWatering: boolean;
  waterEffectTimer: number;
}

const STAGE_THRESHOLDS: { stage: PlantStage; minGrowth: number }[] = [
  { stage: 'seed', minGrowth: 0 },
  { stage: 'sprout', minGrowth: 20 },
  { stage: 'stem', minGrowth: 40 },
  { stage: 'bud', minGrowth: 65 },
  { stage: 'bloom', minGrowth: 90 },
];

const MOOD_COLORS: Record<PlantStage, string> = {
  seed: '#9ca3af',
  sprout: '#86efac',
  stem: '#4ade80',
  bud: '#a78bfa',
  bloom: '#f472b6',
};

const STEM_HEIGHT_MAX = 150;
const STEM_GROW_PER_FRAME = 2;
const LEAF_GROW_PER_FRAME = 0.012;

const LEAF_APPEAR_THRESHOLDS = [15, 30, 50, 70];

export {
  STAGE_THRESHOLDS,
  MOOD_COLORS,
  STEM_HEIGHT_MAX,
  STEM_GROW_PER_FRAME,
  LEAF_GROW_PER_FRAME,
  LEAF_APPEAR_THRESHOLDS,
};

export function getStage(growth: number): PlantStage {
  let result: PlantStage = 'seed';
  for (const t of STAGE_THRESHOLDS) {
    if (growth >= t.minGrowth) result = t.stage;
  }
  return result;
}

export function createInitialPlant(): PlantState {
  return {
    stage: 'seed',
    growthPercent: 0,
    waterLevel: 50,
    lightLevel: 50,
    stemHeight: 0,
    leafCount: 0,
    leafUnfurl: [0, 0, 0, 0],
    bloomProgress: 0,
    saturation: 0.8,
    mood: 0,
    isWatering: false,
    waterEffectTimer: 0,
  };
}

export function getTargetStemHeight(growthPercent: number): number {
  return (growthPercent / 100) * STEM_HEIGHT_MAX;
}

export function updatePlant(state: PlantState, dtMs: number, frameTimeMs: number = 16.67): PlantStage | null {
  const lightFactor = state.lightLevel / 100;
  const waterFactor = state.waterLevel / 100;
  const frameRatio = dtMs / frameTimeMs;

  if (state.isWatering) {
    state.waterEffectTimer -= dtMs;
    if (state.waterEffectTimer <= 0) {
      state.isWatering = false;
      state.waterEffectTimer = 0;
    }
  }

  if (state.waterLevel > 0) {
    state.waterLevel = Math.max(0, state.waterLevel - 0.008 * frameRatio);
  }

  if (state.growthPercent < 100) {
    const growthRate = 0.08 * (0.3 + lightFactor * 0.4 + waterFactor * 0.3);
    state.growthPercent = Math.min(100, state.growthPercent + growthRate * frameRatio);
  }

  const newStage = getStage(state.growthPercent);
  let stageChanged: PlantStage | null = null;
  if (newStage !== state.stage) {
    stageChanged = newStage;
    state.stage = newStage;
  }

  const targetH = getTargetStemHeight(state.growthPercent);
  const diff = targetH - state.stemHeight;
  if (Math.abs(diff) > 0.1) {
    const step = Math.min(STEM_GROW_PER_FRAME * frameRatio, Math.abs(diff));
    state.stemHeight += Math.sign(diff) * step;
  } else {
    state.stemHeight = targetH;
  }

  for (let i = 0; i < 4; i++) {
    const threshold = LEAF_APPEAR_THRESHOLDS[i];
    const shouldGrow = state.growthPercent >= threshold;
    const targetUnfurl = shouldGrow ? 1 : 0;
    const current = state.leafUnfurl[i];
    if (current !== targetUnfurl) {
      const step = LEAF_GROW_PER_FRAME * frameRatio;
      if (current < targetUnfurl) {
        state.leafUnfurl[i] = Math.min(targetUnfurl, current + step);
      } else {
        state.leafUnfurl[i] = Math.max(targetUnfurl, current - step);
      }
    }
  }

  state.leafCount = state.leafUnfurl.filter(u => u > 0.01).length;

  if (state.stage === 'bloom') {
    const bloomSpeed = 0.004 * frameRatio;
    state.bloomProgress = Math.min(1, state.bloomProgress + bloomSpeed);
  }

  const targetSat = state.isWatering ? 1.0 : 0.8;
  state.saturation += (targetSat - state.saturation) * 0.03;

  const stageIdx = STAGE_THRESHOLDS.findIndex(s => s.stage === state.stage);
  const stageProgress = stageIdx / (STAGE_THRESHOLDS.length - 1);
  state.mood = stageProgress * 0.8 + state.bloomProgress * 0.2;

  return stageChanged;
}

export function waterPlant(state: PlantState): void {
  state.waterLevel = Math.min(100, state.waterLevel + 25);
  state.isWatering = true;
  state.waterEffectTimer = 2000;
  if (state.growthPercent < 100) {
    state.growthPercent = Math.min(100, state.growthPercent + 2);
  }
}
