import { create } from 'zustand';
import { type ToolType, type Bone } from './FossilData';
import { GridEngine } from './GridEngine';

interface GameState {
  activeTool: ToolType;
  bones: Bone[];
  excavatedCount: number;
  totalBones: number;
  isComplete: boolean;
  recentlyExcavated: string | null;
  gridEngine: GridEngine;

  setActiveTool: (tool: ToolType) => void;
  dig: (row: number, col: number) => string[];
  placeBone: (boneId: string) => void;
  clearRecentlyExcavated: () => void;
  reset: () => void;
  syncState: () => void;
}

const engine = new GridEngine();

export const useGameStore = create<GameState>((set, get) => ({
  activeTool: 'brush',
  bones: engine.getAllBones(),
  excavatedCount: 0,
  totalBones: engine.getTotalBones(),
  isComplete: false,
  recentlyExcavated: null,
  gridEngine: engine,

  setActiveTool: (tool: ToolType) => {
    engine.setActiveTool(tool);
    set({ activeTool: tool });
  },

  dig: (row: number, col: number) => {
    const result = engine.dig(row, col);
    const state = get();
    const newlyRevealed: string[] = [];

    if (result.bonesRevealed.length > 0) {
      newlyRevealed.push(...result.bonesRevealed);
    }

    const excavatedCount = engine.getExcavatedCount();
    set({
      bones: engine.getAllBones(),
      excavatedCount,
      recentlyExcavated: newlyRevealed.length > 0 ? newlyRevealed[0] : null,
    });

    return newlyRevealed;
  },

  placeBone: (boneId: string) => {
    engine.markBonePlaced(boneId);
    const isComplete = engine.isComplete();
    const excavatedCount = engine.getExcavatedCount();
    set({
      bones: engine.getAllBones(),
      isComplete,
      excavatedCount,
    });
  },

  clearRecentlyExcavated: () => {
    set({ recentlyExcavated: null });
  },

  reset: () => {
    engine.reset();
    set({
      activeTool: 'brush',
      bones: engine.getAllBones(),
      excavatedCount: 0,
      totalBones: engine.getTotalBones(),
      isComplete: false,
      recentlyExcavated: null,
    });
  },

  syncState: () => {
    set({
      bones: engine.getAllBones(),
      excavatedCount: engine.getExcavatedCount(),
      isComplete: engine.isComplete(),
    });
  },
}));
