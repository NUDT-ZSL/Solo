import { create } from 'zustand';
import type { MaterialPreset, MaterialSelection } from '../utils/theme';
import { DEFAULT_WALL, DEFAULT_ROOF, DEFAULT_WINDOW } from '../utils/theme';

export interface Marker {
  id: number;
  position: [number, number, number];
}

export interface MaterialStore {
  currentMaterials: MaterialSelection;
  history: MaterialSelection[];
  historyIndex: number;
  markers: Marker[];
  isCompareMode: boolean;
  splitRatio: number;
  undoMessage: string | null;
  showUndoMessage: boolean;

  selectMaterial: (type: 'wall' | 'roof' | 'window', preset: MaterialPreset) => void;
  undo: () => void;
  addMarker: (position: [number, number, number]) => void;
  clearMarkers: () => void;
  toggleCompareMode: () => void;
  setSplitRatio: (ratio: number) => void;
  hideUndoMessage: () => void;
}

export const useMaterialStore = create<MaterialStore>((set, get) => {
  const initialMaterials: MaterialSelection = {
    wall: DEFAULT_WALL,
    roof: DEFAULT_ROOF,
    window: DEFAULT_WINDOW,
  };

  return {
    currentMaterials: { ...initialMaterials },
    history: [{ ...initialMaterials }],
    historyIndex: 0,
    markers: [],
    isCompareMode: false,
    splitRatio: 0.5,
    undoMessage: null,
    showUndoMessage: false,

    selectMaterial: (type, preset) => {
      const state = get();
      const newMaterials = {
        ...state.currentMaterials,
        [type]: preset,
      };

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ ...newMaterials });

      if (newHistory.length > 11) {
        newHistory.shift();
      }

      set({
        currentMaterials: newMaterials,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    },

    undo: () => {
      const state = get();
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        const prevMaterials = state.history[newIndex];
        set({
          currentMaterials: { ...prevMaterials },
          historyIndex: newIndex,
          undoMessage: '已撤销到上一步材质方案',
          showUndoMessage: true,
        });
        setTimeout(() => {
          set({ showUndoMessage: false, undoMessage: null });
        }, 300);
      }
    },

    addMarker: (position) => {
      const state = get();
      const newMarkers = [...state.markers];
      if (newMarkers.length >= 5) {
        newMarkers.shift();
      }
      newMarkers.push({
        id: Date.now(),
        position,
      });
      set({ markers: newMarkers });
    },

    clearMarkers: () => set({ markers: [] }),

    toggleCompareMode: () => {
      set((state) => ({ isCompareMode: !state.isCompareMode }));
    },

    setSplitRatio: (ratio) => {
      const clamped = Math.max(0.3, Math.min(0.7, ratio));
      set({ splitRatio: clamped });
    },

    hideUndoMessage: () => set({ showUndoMessage: false, undoMessage: null }),
  };
});

export type { MaterialSelection };
