import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ActivityRecord, ActivityLabel, ActiveTimer, DEFAULT_LABELS, getDateKey } from './types';

const STORAGE_KEYS = {
  records: 'focus-tracker:records',
  labels: 'focus-tracker:labels',
  timer: 'focus-tracker:timer',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

interface FocusStore {
  records: ActivityRecord[];
  labels: ActivityLabel[];
  activeTimer: ActiveTimer | null;
  lastNewRecordId: string | null;

  startTimer: (label: string) => void;
  stopTimer: () => void;
  addRecord: (record: Omit<ActivityRecord, 'id'>) => void;
  deleteRecord: (id: string) => void;
  toggleProductive: (labelName: string) => void;
  addLabel: (name: string, color: string, isProductive: boolean) => void;
  removeLabel: (name: string) => void;
  exportCSV: () => string;
}

export const useFocusStore = create<FocusStore>((set, get) => ({
  records: loadFromStorage<ActivityRecord[]>(STORAGE_KEYS.records, []),
  labels: loadFromStorage<ActivityLabel[]>(STORAGE_KEYS.labels, DEFAULT_LABELS),
  activeTimer: loadFromStorage<ActiveTimer | null>(STORAGE_KEYS.timer, null),
  lastNewRecordId: null,

  startTimer: (label: string) => {
    const timer: ActiveTimer = { label, startTime: Date.now() };
    saveToStorage(STORAGE_KEYS.timer, timer);
    set({ activeTimer: timer });
  },

  stopTimer: () => {
    const { activeTimer, records } = get();
    if (!activeTimer) return;
    const endTime = Date.now();
    const durationMs = endTime - activeTimer.startTime;
    const newRecord: ActivityRecord = {
      id: uuidv4(),
      label: activeTimer.label,
      startTime: activeTimer.startTime,
      endTime,
      durationMs,
    };
    const updatedRecords = [...records, newRecord];
    saveToStorage(STORAGE_KEYS.records, updatedRecords);
    saveToStorage(STORAGE_KEYS.timer, null);
    set({ records: updatedRecords, activeTimer: null, lastNewRecordId: newRecord.id });
  },

  addRecord: (record) => {
    const newRecord: ActivityRecord = { ...record, id: uuidv4() };
    const updatedRecords = [...get().records, newRecord];
    saveToStorage(STORAGE_KEYS.records, updatedRecords);
    set({ records: updatedRecords, lastNewRecordId: newRecord.id });
  },

  deleteRecord: (id: string) => {
    const updatedRecords = get().records.filter((r) => r.id !== id);
    saveToStorage(STORAGE_KEYS.records, updatedRecords);
    set({ records: updatedRecords });
  },

  toggleProductive: (labelName: string) => {
    const updatedLabels = get().labels.map((l) =>
      l.name === labelName ? { ...l, isProductive: !l.isProductive } : l
    );
    saveToStorage(STORAGE_KEYS.labels, updatedLabels);
    set({ labels: updatedLabels });
  },

  addLabel: (name: string, color: string, isProductive: boolean) => {
    const newLabel: ActivityLabel = { name, color, isProductive };
    const updatedLabels = [...get().labels, newLabel];
    saveToStorage(STORAGE_KEYS.labels, updatedLabels);
    set({ labels: updatedLabels });
  },

  removeLabel: (name: string) => {
    const updatedLabels = get().labels.filter((l) => l.name !== name);
    saveToStorage(STORAGE_KEYS.labels, updatedLabels);
    set({ labels: updatedLabels });
  },

  exportCSV: () => {
    const { records, labels } = get();
    const productiveSet = new Set(labels.filter((l) => l.isProductive).map((l) => l.name));
    const header = 'ID,Activity,StartTime,EndTime,Duration(ms),Duration(human),Date,IsProductive';
    const rows = records.map((r) => {
      const d = new Date(r.startTime);
      const dateStr = getDateKey(r.startTime);
      const startStr = d.toLocaleTimeString('zh-CN', { hour12: false });
      const endStr = new Date(r.endTime).toLocaleTimeString('zh-CN', { hour12: false });
      const hours = Math.floor(r.durationMs / 3600000);
      const mins = Math.floor((r.durationMs % 3600000) / 60000);
      const secs = Math.floor((r.durationMs % 60000) / 1000);
      const human = `${hours}h ${mins}m ${secs}s`;
      const isProd = productiveSet.has(r.label) ? 'Yes' : 'No';
      return `${r.id},${r.label},${startStr},${endStr},${r.durationMs},${human},${dateStr},${isProd}`;
    });
    return [header, ...rows].join('\n');
  },
}));
