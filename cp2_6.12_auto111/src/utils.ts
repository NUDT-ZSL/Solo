import type { EnvironmentParams } from './types';
import { COLORS } from './types';

let nodeIdCounter = 0;
export function generateNodeId(): string {
  return `node_${Date.now()}_${nodeIdCounter++}`;
}

let particleIdCounter = 0;
export function generateParticleId(): string {
  return `particle_${Date.now()}_${particleIdCounter++}`;
}

let effectIdCounter = 0;
export function generateEffectId(): string {
  return `effect_${Date.now()}_${effectIdCounter++}`;
}

export function calculateGrowthMultiplier(env: EnvironmentParams): number {
  const lightDeviation = Math.abs(env.light - 50);
  const waterDeviation = Math.abs(env.water - 50);
  const tempDeviation = Math.abs(env.temperature - 25);
  
  let multiplier = 1.0;
  multiplier *= Math.max(0, 1 - lightDeviation * 0.02);
  multiplier *= Math.max(0, 1 - waterDeviation * 0.02);
  multiplier *= Math.max(0, 1 - tempDeviation * 0.04);
  
  return Math.max(0, multiplier);
}

export function checkWilting(env: EnvironmentParams): boolean {
  return Math.abs(env.light - 50) > 40 || Math.abs(env.water - 50) > 40;
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  if (!c1 || !c2) return color1;
  
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function getLeafColor(progress: number, isWilting: boolean, wiltingProgress: number): string {
  if (isWilting) {
    return lerpColor(lerpColor(COLORS.LIGHT_GREEN, COLORS.DARK_GREEN, progress), COLORS.BROWN, wiltingProgress);
  }
  return lerpColor(COLORS.LIGHT_GREEN, COLORS.DARK_GREEN, progress);
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeInQuad(t: number): number {
  return t * t;
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export const STAGE_DURATIONS = [10000, 10000, 20000, 15000];
export const TOTAL_DURATION = STAGE_DURATIONS.reduce((a, b) => a + b, 0);

export function getStageAndProgress(elapsedMs: number, multiplier: number): { stage: 0 | 1 | 2 | 3; progress: number; totalProgress: number } {
  const adjustedElapsed = elapsedMs * Math.max(0.01, multiplier);
  
  let accumulated = 0;
  for (let i = 0; i < STAGE_DURATIONS.length; i++) {
    if (adjustedElapsed < accumulated + STAGE_DURATIONS[i]) {
      const stageProgress = (adjustedElapsed - accumulated) / STAGE_DURATIONS[i];
      return {
        stage: i as 0 | 1 | 2 | 3,
        progress: clamp(stageProgress, 0, 1),
        totalProgress: adjustedElapsed / TOTAL_DURATION
      };
    }
    accumulated += STAGE_DURATIONS[i];
  }
  
  return { stage: 3, progress: 1, totalProgress: 1 };
}

export function getGrowthProgressForNode(nodeCreatedAt: number, now: number, multiplier: number): number {
  const nodeAge = (now - nodeCreatedAt) * multiplier;
  return clamp(nodeAge / 2000, 0, 1);
}

export function getTrendArrow(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
}
