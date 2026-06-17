export interface Member {
  id: string;
  name: string;
  voicePart: string;
  joinDate: string;
}

export interface ScoreRecord {
  id: string;
  memberId: string;
  date: string;
  songs: string[];
  pitch: number;
  rhythm: number;
  expression: number;
  note: string;
  audioUrl?: string;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function calcAverage(scores: ScoreRecord[], field: 'pitch' | 'rhythm' | 'expression'): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, s) => acc + s[field], 0);
  return sum / scores.length;
}

export function calcAllAverages(scores: ScoreRecord[]): { pitch: number; rhythm: number; expression: number } {
  return {
    pitch: calcAverage(scores, 'pitch'),
    rhythm: calcAverage(scores, 'rhythm'),
    expression: calcAverage(scores, 'expression'),
  };
}

export function toRadarData(score: ScoreRecord): { subject: string; value: number }[] {
  return [
    { subject: '音准', value: score.pitch },
    { subject: '节奏', value: score.rhythm },
    { subject: '表现力', value: score.expression },
  ];
}

export function toLineData(scores: ScoreRecord[], field: 'pitch' | 'rhythm'): { date: string; score: number }[] {
  return [...scores]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((s) => ({ date: s.date, score: s[field] }));
}

export const SONG_LIST = ['茉莉花', '月亮代表我的心', '彩虹', '送别'];
