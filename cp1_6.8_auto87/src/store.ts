import { create } from 'zustand';
import { GameEngine, type Move } from './GameEngine';

interface GoStore {
  engine: GameEngine;
  moves: Move[];
  currentMoveIndex: number;
  selectedMove: Move | null;
  hoverMove: Move | null;
  branches: { name: string; moves: Move[]; startMoveIndex: number }[];
  currentBranchIndex: number;
  isManualMode: boolean;
  showMoveNumbers: boolean;

  loadSgf: (content: string) => void;
  placeStone: (x: number, y: number) => void;
  goForward: () => void;
  goBackward: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  goToMove: (index: number) => void;
  selectMove: (move: Move | null) => void;
  setHoverMove: (move: Move | null) => void;
  switchBranch: (index: number) => void;
  setManualMode: (mode: boolean) => void;
  toggleMoveNumbers: () => void;
  syncState: () => void;
}

const engine = new GameEngine();

export const useGoStore = create<GoStore>((set, get) => ({
  engine,
  moves: [],
  currentMoveIndex: -1,
  selectedMove: null,
  hoverMove: null,
  branches: [],
  currentBranchIndex: 0,
  isManualMode: true,
  showMoveNumbers: false,

  loadSgf: (content: string) => {
    engine.loadSgf(content);
    get().syncState();
  },

  placeStone: (x: number, y: number) => {
    const move = engine.placeStone(x, y);
    if (move) {
      get().syncState();
    }
  },

  goForward: () => {
    engine.goForward();
    get().syncState();
  },

  goBackward: () => {
    engine.goBackward();
    get().syncState();
  },

  goToStart: () => {
    engine.goToStart();
    get().syncState();
  },

  goToEnd: () => {
    engine.goToEnd();
    get().syncState();
  },

  goToMove: (index: number) => {
    engine.goToMove(index);
    get().syncState();
  },

  selectMove: (move: Move | null) => {
    set({ selectedMove: move });
  },

  setHoverMove: (move: Move | null) => {
    set({ hoverMove: move });
  },

  switchBranch: (index: number) => {
    engine.switchBranch(index);
    get().syncState();
  },

  setManualMode: (mode: boolean) => {
    set({ isManualMode: mode });
  },

  toggleMoveNumbers: () => {
    set(state => ({ showMoveNumbers: !state.showMoveNumbers }));
  },

  syncState: () => {
    const state = engine.getState();
    set({
      moves: [...state.moves],
      currentMoveIndex: state.currentMoveIndex,
      branches: [...state.branches],
      currentBranchIndex: state.currentBranchIndex,
    });
  },
}));
