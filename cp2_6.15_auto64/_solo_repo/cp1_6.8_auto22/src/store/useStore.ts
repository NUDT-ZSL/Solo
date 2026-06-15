import { create } from 'zustand';
import { analyzeEmotion, type Emotion } from '../utils/colorUtils';
import { mockInspirations } from '../utils/mockData';

export interface Inspiration {
  id: string;
  content: string;
  continuation?: string;
  emotion: Emotion;
  resonanceCount: number;
  createdAt: string;
}

export interface SparkItem {
  inspirationId: string;
  type: 'resonance' | 'continuation';
  addedAt: string;
}

interface AppState {
  inspirations: Inspiration[];
  sparkCollection: SparkItem[];
  selectedInspiration: Inspiration | null;
  showDetail: boolean;
  isContinuing: boolean;
  isSubmitting: boolean;

  fetchInspirations: () => Promise<void>;
  addInspiration: (content: string) => Promise<void>;
  resonate: (id: string) => Promise<void>;
  continueInspiration: (id: string, continuation: string) => Promise<void>;
  selectInspiration: (inspiration: Inspiration | null) => void;
  setShowDetail: (show: boolean) => void;
  setIsContinuing: (continuing: boolean) => void;
  removeFromSparks: (inspirationId: string) => void;
  loadSparkCollection: () => void;
}

const API_BASE = 'http://localhost:8000/api';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function loadSparksFromStorage(): SparkItem[] {
  try {
    const stored = localStorage.getItem('sparkCollection');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSparksToStorage(sparks: SparkItem[]) {
  localStorage.setItem('sparkCollection', JSON.stringify(sparks));
}

export const useStore = create<AppState>((set, get) => ({
  inspirations: mockInspirations.map((item, i) => ({
    ...item,
    id: `mock-${i}-${Date.now()}`,
  })),
  sparkCollection: loadSparksFromStorage(),
  selectedInspiration: null,
  showDetail: false,
  isContinuing: false,
  isSubmitting: false,

  fetchInspirations: async () => {
    try {
      const res = await fetch(`${API_BASE}/inspirations`);
      if (res.ok) {
        const data = await res.json();
        set({ inspirations: data });
      }
    } catch {
      // use mock data already loaded
    }
  },

  addInspiration: async (content: string) => {
    const emotion = analyzeEmotion(content);
    const newInspiration: Inspiration = {
      id: generateId(),
      content,
      emotion,
      resonanceCount: 0,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      inspirations: [newInspiration, ...state.inspirations],
      isSubmitting: false,
    }));

    try {
      await fetch(`${API_BASE}/inspirations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    } catch {
      // offline mode, already added locally
    }
  },

  resonate: async (id: string) => {
    set((state) => ({
      inspirations: state.inspirations.map((insp) =>
        insp.id === id
          ? { ...insp, resonanceCount: insp.resonanceCount + 1 }
          : insp
      ),
      sparkCollection: (() => {
        const existing = state.sparkCollection.find(
          (s) => s.inspirationId === id && s.type === 'resonance'
        );
        if (existing) return state.sparkCollection;
        const newSpark: SparkItem = {
          inspirationId: id,
          type: 'resonance',
          addedAt: new Date().toISOString(),
        };
        const updated = [...state.sparkCollection, newSpark];
        saveSparksToStorage(updated);
        return updated;
      })(),
    }));

    try {
      await fetch(`${API_BASE}/inspirations/${id}/resonate`, {
        method: 'POST',
      });
    } catch {
      // offline mode
    }
  },

  continueInspiration: async (id: string, continuation: string) => {
    set((state) => ({
      inspirations: state.inspirations.map((insp) =>
        insp.id === id ? { ...insp, continuation } : insp
      ),
      isContinuing: false,
      sparkCollection: (() => {
        const newSpark: SparkItem = {
          inspirationId: id,
          type: 'continuation',
          addedAt: new Date().toISOString(),
        };
        const updated = [...state.sparkCollection, newSpark];
        saveSparksToStorage(updated);
        return updated;
      })(),
    }));

    try {
      await fetch(`${API_BASE}/inspirations/${id}/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, continuation }),
      });
    } catch {
      // offline mode
    }
  },

  selectInspiration: (inspiration: Inspiration | null) => {
    set({ selectedInspiration: inspiration, showDetail: !!inspiration });
  },

  setShowDetail: (show: boolean) => {
    set({ showDetail: show, isContinuing: false });
    if (!show) set({ selectedInspiration: null });
  },

  setIsContinuing: (continuing: boolean) => {
    set({ isContinuing: continuing });
  },

  removeFromSparks: (inspirationId: string) => {
    set((state) => {
      const updated = state.sparkCollection.filter(
        (s) => s.inspirationId !== inspirationId
      );
      saveSparksToStorage(updated);
      return { sparkCollection: updated };
    });
  },

  loadSparkCollection: () => {
    set({ sparkCollection: loadSparksFromStorage() });
  },
}));
