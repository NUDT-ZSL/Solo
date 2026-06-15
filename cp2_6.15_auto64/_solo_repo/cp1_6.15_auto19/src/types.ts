export interface ActivityRecord {
  id: string;
  label: string;
  startTime: number;
  endTime: number;
  durationMs: number;
}

export interface ActivityLabel {
  name: string;
  isProductive: boolean;
  color: string;
}

export interface ActiveTimer {
  label: string;
  startTime: number;
}

export interface DayScore {
  date: string;
  score: number;
  totalMs: number;
  productiveMs: number;
}

export const DEFAULT_LABELS: ActivityLabel[] = [
  { name: '编程', isProductive: true, color: '#0db9a0' },
  { name: '写作', isProductive: true, color: '#89b4fa' },
  { name: '阅读', isProductive: true, color: '#a6e3a1' },
  { name: '学习', isProductive: true, color: '#cba6f7' },
  { name: '设计', isProductive: true, color: '#f9e2af' },
  { name: '会议', isProductive: false, color: '#fab387' },
  { name: '刷视频', isProductive: false, color: '#f38ba8' },
  { name: '社交媒体', isProductive: false, color: '#eba0ac' },
  { name: '游戏', isProductive: false, color: '#f5c2e7' },
  { name: '其他', isProductive: false, color: '#9399b2' },
];

export function getDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getRecordsForDate(records: ActivityRecord[], dateKey: string): ActivityRecord[] {
  return records.filter((r) => getDateKey(r.startTime) === dateKey);
}

export function calculateFocusScore(records: ActivityRecord[], labels: ActivityLabel[], dateKey: string): DayScore {
  const dayRecords = getRecordsForDate(records, dateKey);
  const productiveNames = new Set(labels.filter((l) => l.isProductive).map((l) => l.name));
  const totalMs = dayRecords.reduce((sum, r) => sum + r.durationMs, 0);
  const productiveMs = dayRecords.filter((r) => productiveNames.has(r.label)).reduce((sum, r) => sum + r.durationMs, 0);
  const score = totalMs === 0 ? 0 : Math.round((productiveMs / totalMs) * 100);
  return { date: dateKey, score, totalMs, productiveMs };
}
