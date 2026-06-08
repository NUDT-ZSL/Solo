import { create } from 'zustand';
import type { BottleData, Emotion, AnalysisResult } from './BottleData';
import { EMOTION_CONFIG } from './BottleData';
import { analyzeEmotion } from './emotionAnalysis';

interface OceanState {
  bottles: BottleData[];
  selectedBottleId: string | null;
  draggedBottleId: string | null;
  analysisResult: AnalysisResult | null;
  showAnalysis: boolean;
  isPublishing: boolean;
  brokenBottleIds: string[];
  reactionAnimations: Array<{ bottleId: string; type: 'like' | 'comfort' | 'sigh'; timestamp: number }>;

  addBottle: (emotion: Emotion, content: string) => void;
  selectBottle: (id: string | null) => void;
  startDrag: (id: string) => void;
  endDrag: () => void;
  analyzeBottle: (id: string) => void;
  closeAnalysis: () => void;
  setPublishing: (val: boolean) => void;
  addReaction: (bottleId: string, type: 'like' | 'comfort' | 'sigh') => void;
  breakBottle: (id: string) => void;
  removeBrokenBottle: (id: string) => void;
  updateBottlePosition: (id: string, position: [number, number, number]) => void;
  setBottles: (bottles: BottleData[]) => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function randomPosition(): [number, number, number] {
  const x = (Math.random() - 0.3) * 12;
  const z = (Math.random() - 0.5) * 8;
  return [x, 0.15, z];
}

export const useOceanStore = create<OceanState>((set, get) => ({
  bottles: [],
  selectedBottleId: null,
  draggedBottleId: null,
  analysisResult: null,
  showAnalysis: false,
  isPublishing: false,
  brokenBottleIds: [],
  reactionAnimations: [],

  addBottle: (emotion, content) => {
    const bottle: BottleData = {
      id: generateId(),
      emotion,
      content,
      position: randomPosition(),
      reactions: { like: 0, comfort: 0, sigh: 0 },
      created_at: new Date().toISOString(),
    };
    set(state => ({ bottles: [...state.bottles, bottle] }));
  },

  selectBottle: (id) => set({ selectedBottleId: id }),

  startDrag: (id) => set({ draggedBottleId: id, selectedBottleId: id }),

  endDrag: () => set({ draggedBottleId: null }),

  analyzeBottle: (id) => {
    const bottle = get().bottles.find(b => b.id === id);
    if (!bottle) return;
    const result = analyzeEmotion(bottle.content, bottle.emotion);
    set({
      analysisResult: result,
      showAnalysis: true,
      selectedBottleId: id,
      brokenBottleIds: [...get().brokenBottleIds, id],
    });
  },

  closeAnalysis: () => set({ showAnalysis: false, analysisResult: null, selectedBottleId: null }),

  setPublishing: (val) => set({ isPublishing: val }),

  addReaction: (bottleId, type) => {
    set(state => ({
      bottles: state.bottles.map(b =>
        b.id === bottleId
          ? { ...b, reactions: { ...b.reactions, [type]: b.reactions[type] + 1 } }
          : b
      ),
      reactionAnimations: [...state.reactionAnimations, { bottleId, type, timestamp: Date.now() }],
    }));
    setTimeout(() => {
      set(state => ({
        reactionAnimations: state.reactionAnimations.filter(a => a.timestamp > Date.now() - 1500),
      }));
    }, 1500);
  },

  breakBottle: (id) => set(state => ({
    brokenBottleIds: [...state.brokenBottleIds, id],
  })),

  removeBrokenBottle: (id) => set(state => ({
    brokenBottleIds: state.brokenBottleIds.filter(bid => bid !== id),
    bottles: state.bottles.filter(b => b.id !== id),
  })),

  updateBottlePosition: (id, position) => set(state => ({
    bottles: state.bottles.map(b =>
      b.id === id ? { ...b, position } : b
    ),
  })),

  setBottles: (bottles) => set({ bottles }),
}));

export function getEmotionStats(bottles: BottleData[]) {
  const stats: Record<Emotion, number> = { happy: 0, sad: 0, angry: 0, calm: 0, fear: 0 };
  for (const b of bottles) {
    stats[b.emotion]++;
  }
  return stats;
}
