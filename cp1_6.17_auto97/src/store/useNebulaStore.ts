import { create } from 'zustand';
import type { NebulaState, PresetType } from '../types';

export const useNebulaStore = create<NebulaState>((set) => ({
  density: 5000,
  hueOffset: 0,
  sizeScale: 1.0,
  rotationSpeed: 0.01,
  brightness: 1.0,
  opacityBase: 0.5,
  primaryColor: '#FF6B35',
  preset: 'spiral',

  setDensity: (value: number) => set({ density: value }),
  setHueOffset: (value: number) => set({ hueOffset: value }),
  setSizeScale: (value: number) => set({ sizeScale: value }),
  setRotationSpeed: (value: number) => set({ rotationSpeed: value }),
  setBrightness: (value: number) => set({ brightness: value }),
  setOpacityBase: (value: number) => set({ opacityBase: value }),
  setPrimaryColor: (value: string) => set({ primaryColor: value }),
  setPreset: (preset: PresetType) => set({ preset }),
}));
