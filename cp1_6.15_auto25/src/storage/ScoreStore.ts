import { v4 as uuidv4 } from 'uuid';

export interface ScoreRecord {
  id: string;
  nickname: string;
  score: number;
  duration: number;
  kills: number;
  timestamp: number;
}

const STORAGE_KEY = 'asteroid_survival_scores';
const MAX_RECORDS = 20;

export function getScores(): ScoreRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: ScoreRecord[] = JSON.parse(raw);
    return parsed;
  } catch {
    return [];
  }
}

export function addScore(nickname: string, score: number, duration: number, kills: number): void {
  const records = getScores();
  const newRecord: ScoreRecord = {
    id: uuidv4(),
    nickname: nickname.trim() || '匿名玩家',
    score,
    duration,
    kills,
    timestamp: Date.now(),
  };
  records.push(newRecord);
  records.sort((a, b) => b.score - a.score);
  const trimmed = records.slice(0, MAX_RECORDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export type SortField = 'score' | 'kills' | 'duration' | 'nickname';
export type SortOrder = 'asc' | 'desc';

export function sortScores(records: ScoreRecord[], field: SortField, order: SortOrder): ScoreRecord[] {
  const sorted = [...records].sort((a, b) => {
    if (field === 'nickname') {
      const cmp = a.nickname.localeCompare(b.nickname);
      return order === 'asc' ? cmp : -cmp;
    }
    const valA = a[field] as number;
    const valB = b[field] as number;
    return order === 'asc' ? valA - valB : valB - valA;
  });
  return sorted;
}
