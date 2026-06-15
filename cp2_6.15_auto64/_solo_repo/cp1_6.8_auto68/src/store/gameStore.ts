import { create } from 'zustand';
import { GameState } from '@/engine/types';

interface GameStore {
  gameState: GameState | null;
  updateFromEngine: (state: GameState) => void;
  canvasSize: { width: number; height: number };
  setCanvasSize: (size: { width: number; height: number }) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  updateFromEngine: (state: GameState) => set({ gameState: state }),
  canvasSize: { width: 1024, height: 768 },
  setCanvasSize: (size) => set({ canvasSize: size }),
}));
