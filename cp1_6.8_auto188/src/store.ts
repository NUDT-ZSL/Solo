import { create } from 'zustand';

export type InkColor = 'black' | 'vermilion' | 'azurite';

export interface PoemData {
  text: string;
  author: string;
}

interface InkStore {
  inkColor: InkColor;
  isDrawing: boolean;
  currentPoem: PoemData | null;
  poemVisible: boolean;
  setInkColor: (color: InkColor) => void;
  setIsDrawing: (drawing: boolean) => void;
  setCurrentPoem: (poem: PoemData | null) => void;
  setPoemVisible: (visible: boolean) => void;
}

export const useInkStore = create<InkStore>((set) => ({
  inkColor: 'black',
  isDrawing: false,
  currentPoem: null,
  poemVisible: false,
  setInkColor: (color) => set({ inkColor: color }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setCurrentPoem: (poem) => set({ currentPoem: poem, poemVisible: poem !== null }),
  setPoemVisible: (visible) => set({ poemVisible: visible }),
}));
