import { create } from 'zustand';

interface StarStore {
  particleDensity: number;
  flowSpeed: number;
  spectralShift: number;
  randomSeed: number;
  setParticleDensity: (v: number) => void;
  setFlowSpeed: (v: number) => void;
  setSpectralShift: (v: number) => void;
  resetAll: () => void;
  randomize: () => void;
}

const DEFAULT_DENSITY = 2000;
const DEFAULT_SPEED = 0.5;
const DEFAULT_SHIFT = 0.0;

export const useStarStore = create<StarStore>((set) => ({
  particleDensity: DEFAULT_DENSITY,
  flowSpeed: DEFAULT_SPEED,
  spectralShift: DEFAULT_SHIFT,
  randomSeed: 0,
  setParticleDensity: (v) => set({ particleDensity: v }),
  setFlowSpeed: (v) => set({ flowSpeed: v }),
  setSpectralShift: (v) => set({ spectralShift: v }),
  resetAll: () =>
    set({
      particleDensity: DEFAULT_DENSITY,
      flowSpeed: DEFAULT_SPEED,
      spectralShift: DEFAULT_SHIFT,
    }),
  randomize: () =>
    set((state) => ({
      randomSeed: state.randomSeed + 1,
    })),
}));
