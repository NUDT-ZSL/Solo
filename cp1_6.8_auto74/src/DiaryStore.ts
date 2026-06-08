import { create } from 'zustand';
import { DiaryEntry, MoodColor, MoodStat, TrendData } from './types';
import { MOOD_COLORS, MOOD_VALUE_MAP } from './constants';

const STORAGE_KEY = 'xuyu-diary-entries';

function loadEntries(): DiaryEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: DiaryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

interface DiaryStore {
  entries: DiaryEntry[];
  addEntry: (text: string, moodColor: MoodColor) => void;
  getStats: () => MoodStat[];
  getTrend: (days: number) => TrendData[];
}

export const useDiaryStore = create<DiaryStore>((set, get) => ({
  entries: loadEntries(),

  addEntry: (text: string, moodColor: MoodColor) => {
    const entry: DiaryEntry = {
      id: `diary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text,
      moodColor,
      createdAt: Date.now(),
    };
    const newEntries = [...get().entries, entry];
    set({ entries: newEntries });
    saveEntries(newEntries);
  },

  getStats: () => {
    const entries = get().entries;
    if (entries.length === 0) return [];

    const colorCounts: Record<string, number> = {};
    for (const m of MOOD_COLORS) {
      colorCounts[m.color] = 0;
    }
    for (const e of entries) {
      colorCounts[e.moodColor] = (colorCounts[e.moodColor] || 0) + 1;
    }

    return MOOD_COLORS.map((m) => ({
      color: m.color,
      label: m.label,
      count: colorCounts[m.color] || 0,
      percentage:
        entries.length > 0 ? (colorCounts[m.color] || 0) / entries.length : 0,
    })).filter((s) => s.count > 0);
  },

  getTrend: (days: number) => {
    const entries = get().entries;
    const now = new Date();
    const trend: TrendData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      ).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const dayEntries = entries.filter(
        (e) => e.createdAt >= dayStart && e.createdAt < dayEnd
      );
      const avgMood =
        dayEntries.length > 0
          ? dayEntries.reduce(
              (sum, e) => sum + (MOOD_VALUE_MAP[e.moodColor] || 0),
              0
            ) / dayEntries.length
          : 0;

      trend.push({ date: dateStr, avgMood });
    }

    return trend;
  },
}));
