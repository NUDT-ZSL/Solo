import { create } from 'zustand';
import type { SimulationParams } from '../core/SimulationEngine';

export type Resolution = 32 | 64 | 128;

interface SimulationState extends SimulationParams {
  waveSpeed: number;
  damping: number;
  resolution: Resolution;
  fps: number;
  sourceX: number;
  sourceY: number;
  setWaveSpeed: (speed: number) => void;
  setDamping: (damping: number) => void;
  setResolution: (res: Resolution) => void;
  setFps: (fps: number) => void;
  setSourceX: (x: number) => void;
  setSourceY: (y: number) => void;
  setParams: (params: Partial<SimulationParams>) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  waveSpeed: 1.5,
  damping: 0.05,
  resolution: 64,
  fps: 60,
  sourceX: 0,
  sourceY: 0,
  setWaveSpeed: (speed: number) => set({ waveSpeed: speed }),
  setDamping: (damping: number) => set({ damping }),
  setResolution: (res: Resolution) => set({ resolution: res }),
  setFps: (fps: number) => set({ fps }),
  setSourceX: (x: number) => set({ sourceX: x }),
  setSourceY: (y: number) => set({ sourceY: y }),
  setParams: (params: Partial<SimulationParams>) => set(params)
}));
