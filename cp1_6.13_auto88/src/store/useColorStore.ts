import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { generateColorPalette, validatePalette } from '../engine/colorEngine';

interface ColorState {
  currentHour: number;
  colors: string[];
  exportPanelOpen: boolean;
  exportSuccess: boolean;
  setCurrentHour: (hour: number) => void;
  generateColors: () => void;
  toggleExportPanel: () => void;
  closeExportPanel: () => void;
  triggerExportSuccess: () => void;
}

validatePalette();

export const useColorStore = create<ColorState>((set, get) => ({
  currentHour: 12,
  colors: generateColorPalette(12),
  exportPanelOpen: false,
  exportSuccess: false,

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
    set((state) => ({ exportPanelOpen: !state.exportPanelOpen, exportSuccess: false }));
  },

  closeExportPanel: () => {
    set({ exportPanelOpen: false, exportSuccess: false });
  },

  triggerExportSuccess: () => {
    set({ exportSuccess: true });
    setTimeout(() => {
      set({ exportSuccess: false });
    }, 2000);
  },
}));

export function useColors() {
  return useColorStore(useShallow((state) => state.colors));
}

export function useCurrentHour() {
  return useColorStore((state) => state.currentHour);
}
