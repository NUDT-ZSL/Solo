export interface RippleData {
  id: string;
  origin: [number, number, number];
  startTime: number;
  frequency: number;
  amplitude: number;
  color: [number, number, number];
  reflections: number;
  maxRadius: number;
}

export interface ResonanceBurstData {
  id: string;
  position: [number, number, number];
  startTime: number;
  frequency: number;
  intensity: number;
  reflections: number;
}

export interface AudioState {
  isActive: boolean;
  frequency: number;
  volume: number;
  spectrum: number[];
}

interface EchoStore {
  ripples: RippleData[];
  audioState: AudioState;
  resonanceBursts: ResonanceBurstData[];
  activeCard: ResonanceBurstData | null;
  addRipple: (ripple: RippleData) => void;
  removeRipple: (id: string) => void;
  updateAudioState: (state: Partial<AudioState>) => void;
  addResonanceBurst: (burst: ResonanceBurstData) => void;
  removeResonanceBurst: (id: string) => void;
  setActiveCard: (card: ResonanceBurstData | null) => void;
}

import { create } from 'zustand';

export const useEchoStore = create<EchoStore>((set) => ({
  ripples: [],
  audioState: {
    isActive: false,
    frequency: 0,
    volume: 0,
    spectrum: new Array(64).fill(0),
  },
  resonanceBursts: [],
  activeCard: null,
  addRipple: (ripple) =>
    set((state) => ({ ripples: [...state.ripples, ripple] })),
  removeRipple: (id) =>
    set((state) => ({ ripples: state.ripples.filter((r) => r.id !== id) })),
  updateAudioState: (partial) =>
    set((state) => ({ audioState: { ...state.audioState, ...partial } })),
  addResonanceBurst: (burst) =>
    set((state) => ({ resonanceBursts: [...state.resonanceBursts, burst] })),
  removeResonanceBurst: (id) =>
    set((state) => ({
      resonanceBursts: state.resonanceBursts.filter((b) => b.id !== id),
    })),
  setActiveCard: (card) => set({ activeCard: card }),
}));
