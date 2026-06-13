import { create } from 'zustand';
import { generateColorPalette } from '../engine/colorEngine';

interface ColorState {
  currentHour: number;
  colors: string[];
  exportPanelOpen: boolean;
  setCurrentHour: (hour: number) => void;
  generateColors: () => void;
  toggleExportPanel: () => void;
  closeExportPanel: () => void;
}

export const useColorStore = create<ColorState>((set, get) => ({
  currentHour: 12,
  colors: generateColorPalette(12),
  exportPanelOpen: false,

  setCurrentHour: (hour: number) => {
    const clampedHour = Math.max(0, Math.min(23.999, hour));
    set({
      currentHour: clampedHour,
      colors: generateColorPalette(clampedHour),
    });
  },

  generateColors: () => {
    const { currentHour } = get();
    set({ colors: generateColorPalette(currentHour) });
  },

  toggleExportPanel: () => {
    set((state) => ({ exportPanelOpen: !state.exportPanelOpen }));
  },

  closeExportPanel: () => {
    set({ exportPanelOpen: false });
  },
}));
