import { create } from 'zustand';

export type Duration = 7 | 30 | 365;

export interface Capsule {
  id: string;
  content: string;
  duration: Duration;
  createdAt: string;
  openAt: string;
  isOpened: boolean;
  wallX: number;
  wallY: number;
  rotationSpeed: number;
  floatPhase: number;
  pulsePhase: number;
}

export type FilterStatus = 'all' | 'expired' | 'pending';
export type SortField = 'createdAt' | 'openAt';
export type SortOrder = 'asc' | 'desc';

const STORAGE_KEY = 'time-trace-capsules';

function loadFromStorage(): Capsule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveToStorage(capsules: Capsule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function isExpired(capsule: Capsule): boolean {
  return new Date(capsule.openAt).getTime() <= Date.now();
}

export function getDurationColor(duration: Duration): { primary: string; secondary: string; glow: string } {
  switch (duration) {
    case 7:
      return { primary: '#f5c842', secondary: '#ff9a3c', glow: 'rgba(245,200,66,0.35)' };
    case 30:
      return { primary: '#2dd4a8', secondary: '#06b6d4', glow: 'rgba(45,212,168,0.35)' };
    case 365:
      return { primary: '#4a7cf7', secondary: '#8b5cf6', glow: 'rgba(74,124,247,0.35)' };
  }
}

export function formatDurationLabel(duration: Duration): string {
  switch (duration) {
    case 7: return '7天';
    case 30: return '30天';
    case 365: return '365天';
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

interface CapsuleStore {
  capsules: Capsule[];
  createCapsule: (content: string, duration: Duration) => Capsule;
  openCapsule: (id: string) => void;
  getCapsuleById: (id: string) => Capsule | undefined;
  getFilteredCapsules: (filter: FilterStatus, sortField: SortField, sortOrder: SortOrder) => Capsule[];
}

export const useCapsuleStore = create<CapsuleStore>((set, get) => ({
  capsules: loadFromStorage(),

  createCapsule: (content: string, duration: Duration) => {
    const now = new Date();
    const openDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    const capsule: Capsule = {
      id: generateId(),
      content,
      duration,
      createdAt: now.toISOString(),
      openAt: openDate.toISOString(),
      isOpened: false,
      wallX: randomBetween(0.05, 0.95),
      wallY: randomBetween(0.05, 0.95),
      rotationSpeed: randomBetween(0.0008, 0.0013),
      floatPhase: randomBetween(0, Math.PI * 2),
      pulsePhase: randomBetween(0, Math.PI * 2),
    };
    set((state) => {
      const updated = [...state.capsules, capsule];
      saveToStorage(updated);
      return { capsules: updated };
    });
    return capsule;
  },

  openCapsule: (id: string) => {
    set((state) => {
      const updated = state.capsules.map((c) =>
        c.id === id ? { ...c, isOpened: true } : c
      );
      saveToStorage(updated);
      return { capsules: updated };
    });
  },

  getCapsuleById: (id: string) => {
    return get().capsules.find((c) => c.id === id);
  },

  getFilteredCapsules: (filter: FilterStatus, sortField: SortField, sortOrder: SortOrder) => {
    let result = [...get().capsules];
    if (filter === 'expired') {
      result = result.filter((c) => isExpired(c));
    } else if (filter === 'pending') {
      result = result.filter((c) => !isExpired(c));
    }
    result.sort((a, b) => {
      const aVal = new Date(a[sortField]).getTime();
      const bVal = new Date(b[sortField]).getTime();
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return result;
  },
}));
