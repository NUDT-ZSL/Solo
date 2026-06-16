import type { HitResult, Note } from '../types';

export const JUDGEMENT_WINDOWS = {
  Perfect: 50,
  Good: 100,
  OK: 200
} as const;

export const JUDGEMENT_SCORES = {
  Perfect: 100,
  Good: 70,
  OK: 30,
  Miss: 0
} as const;

export const JUDGEMENT_COLORS = {
  Perfect: '#00FF88',
  Good: '#3498DB',
  OK: '#FFD93D',
  Miss: '#E74C3C'
} as const;

export function calculateHit(
  playerTimestamp: number,
  noteTimestamp: number
): HitResult {
  const timeDiff = playerTimestamp - noteTimestamp;
  const absTimeDiff = Math.abs(timeDiff);
  
  let judgement: HitResult['judgement'];
  let score: number;
  
  if (absTimeDiff <= JUDGEMENT_WINDOWS.Perfect) {
    judgement = 'Perfect';
    score = JUDGEMENT_SCORES.Perfect;
  } else if (absTimeDiff <= JUDGEMENT_WINDOWS.Good) {
    judgement = 'Good';
    score = JUDGEMENT_SCORES.Good;
  } else if (absTimeDiff <= JUDGEMENT_WINDOWS.OK) {
    judgement = 'OK';
    score = JUDGEMENT_SCORES.OK;
  } else {
    judgement = 'Miss';
    score = JUDGEMENT_SCORES.Miss;
  }
  
  return { judgement, score, timeDiff };
}

export function findClosestNote(
  notes: Note[],
  currentTime: number,
  trackIndex: number
): Note | null {
  const trackNotes = notes.filter(n => n.trackIndex === trackIndex && !n.hit);
  
  if (trackNotes.length === 0) return null;
  
  let closestNote: Note | null = null;
  let minDiff = Infinity;
  
  for (const note of trackNotes) {
    const diff = Math.abs(currentTime - note.timestamp);
    if (diff < minDiff && diff <= JUDGEMENT_WINDOWS.OK) {
      minDiff = diff;
      closestNote = note;
    }
  }
  
  return closestNote;
}

export function calculateRating(accuracy: number): 'S' | 'A' | 'B' | 'C' {
  if (accuracy >= 95) return 'S';
  if (accuracy >= 85) return 'A';
  if (accuracy >= 70) return 'B';
  if (accuracy >= 55) return 'C';
  return 'C';
}

export function calculateAccuracy(
  perfectCount: number,
  goodCount: number,
  okCount: number,
  totalNotes: number
): number {
  if (totalNotes === 0) return 0;
  
  const weightedScore = perfectCount * 100 + goodCount * 70 + okCount * 30;
  const maxScore = totalNotes * 100;
  
  return (weightedScore / maxScore) * 100;
}

export function getRatingColor(rating: 'S' | 'A' | 'B' | 'C'): string {
  const colors: Record<string, string> = {
    S: '#FFD700',
    A: '#C0C0C0',
    B: '#CD7F32',
    C: '#8B4513'
  };
  return colors[rating];
}

export function calculateComboBonus(combo: number): number {
  if (combo < 10) return 0;
  if (combo < 30) return 10;
  if (combo < 50) return 25;
  if (combo < 100) return 50;
  return 100;
}
