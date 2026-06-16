export type HitResult = 'perfect' | 'good' | 'ok' | 'miss';

export interface ScoreResult {
  result: HitResult;
  score: number;
  timeDiff: number;
}

const PERFECT_THRESHOLD = 50;
const GOOD_THRESHOLD = 100;
const OK_THRESHOLD = 200;

const SCORE_VALUES: Record<HitResult, number> = {
  perfect: 100,
  good: 70,
  ok: 40,
  miss: 0
};

export function calculateHit(playerTime: number, noteTime: number): ScoreResult {
  const timeDiff = playerTime - noteTime;
  const absDiff = Math.abs(timeDiff);

  let result: HitResult;
  if (absDiff <= PERFECT_THRESHOLD) {
    result = 'perfect';
  } else if (absDiff <= GOOD_THRESHOLD) {
    result = 'good';
  } else if (absDiff <= OK_THRESHOLD) {
    result = 'ok';
  } else {
    result = 'miss';
  }

  return {
    result,
    score: SCORE_VALUES[result],
    timeDiff
  };
}

export function calculateGrade(hitRate: number): string {
  if (hitRate >= 95) return 'S';
  if (hitRate >= 85) return 'A';
  if (hitRate >= 70) return 'B';
  if (hitRate >= 55) return 'C';
  return 'D';
}

export function calculateHitRate(hitCount: number, totalNotes: number): number {
  if (totalNotes === 0) return 0;
  return Math.round((hitCount / totalNotes) * 100);
}

export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'S': '#FFD700',
    'A': '#C0C0C0',
    'B': '#CD7F32',
    'C': '#708090',
    'D': '#E74C3C'
  };
  return colors[grade] || '#999999';
}
