import { create } from 'zustand';
import type { GamePhase } from './types';

interface GameStore {
  currentLevel: number;
  steps: number;
  phase: GamePhase;
  hintFragmentId: number | null;
  showHint: boolean;
  totalLevels: number;
  setCurrentLevel: (level: number) => void;
  incrementSteps: () => void;
  setPhase: (phase: GamePhase) => void;
  setHintFragmentId: (id: number | null) => void;
  setShowHint: (show: boolean) => void;
  resetLevel: () => void;
  nextLevel: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentLevel: 0,
  steps: 0,
  phase: 'idle',
  hintFragmentId: null,
  showHint: false,
  totalLevels: 5,
  setCurrentLevel: (level) => set({ currentLevel: level }),
  incrementSteps: () => set((s) => ({ steps: s.steps + 1 })),
  setPhase: (phase) => set({ phase }),
  setHintFragmentId: (id) => set({ hintFragmentId: id }),
  setShowHint: (show) => set({ showHint: show }),
  resetLevel: () => set({ steps: 0, phase: 'playing', hintFragmentId: null, showHint: false }),
  nextLevel: () => {
    const { currentLevel, totalLevels } = get();
    if (currentLevel < totalLevels - 1) {
      set({ currentLevel: currentLevel + 1, steps: 0, phase: 'playing', hintFragmentId: null, showHint: false });
    } else {
      set({ phase: 'complete' });
    }
  },
}));
