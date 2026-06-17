import type { Base } from './converter';

export interface HistoryRecord {
  id: string;
  input: string;
  fromBase: Base;
  toBase: Base;
  result: string;
  timestamp: string;
}

const STORAGE_KEY = 'base-converter-history';
const MAX_RECORDS = 20;

export function getHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: HistoryRecord[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecord(record: Omit<HistoryRecord, 'id' | 'timestamp'>): HistoryRecord {
  const history = getHistory();
  const newRecord: HistoryRecord = {
    ...record,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: formatTimestamp(new Date()),
  };
  history.unshift(newRecord);
  if (history.length > MAX_RECORDS) {
    history.splice(MAX_RECORDS);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return newRecord;
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
