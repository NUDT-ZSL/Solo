import { create } from 'zustand';
import type { FontStyle } from '@/utils/calligraphyEngine';

interface CalligraphyState {
  fontStyle: FontStyle;
  brushSize: number;
  inkDensity: number;
  setFontStyle: (style: FontStyle) => void;
  setBrushSize: (size: number) => void;
  setInkDensity: (density: number) => void;
}

export const useCalligraphyStore = create<CalligraphyState>((set) => ({
  fontStyle: 'xingshu',
  brushSize: 8,
  inkDensity: 0.85,
  setFontStyle: (style) => set({ fontStyle: style }),
  setBrushSize: (size) => set({ brushSize: size }),
  setInkDensity: (density) => set({ inkDensity: density }),
}));
