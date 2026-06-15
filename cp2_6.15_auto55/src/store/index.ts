import { create } from 'zustand';
import type { GeologyLayer, ParticleData, QueryResult, VectorFieldSample } from '@/types';
import * as api from '@/api/dataService';

interface StoreState {
  simulationTime: number;
  particleSize: number;
  speedMultiplier: number;
  cameraResetKey: number;
  layers: GeologyLayer[];
  particles: ParticleData[];
  vectorField: VectorFieldSample[];
  selectedPoint: QueryResult | null;
  setSimulationTime: (time: number) => void;
  setParticleSize: (size: number) => void;
  setSpeedMultiplier: (multiplier: number) => void;
  setSelectedPoint: (point: QueryResult | null) => void;
  resetCamera: () => void;
  fetchLayers: () => Promise<void>;
  fetchParticles: (time: number) => Promise<void>;
  fetchVectorField: () => Promise<void>;
  queryPoint: (x: number, y: number, z: number) => Promise<void>;
}

export const useStore = create<StoreState>((set) => ({
  simulationTime: 0,
  particleSize: 1.5,
  speedMultiplier: 1,
  cameraResetKey: 0,
  layers: [],
  particles: [],
  vectorField: [],
  selectedPoint: null,

  setSimulationTime: (time) => set({ simulationTime: time }),
  setParticleSize: (size) => set({ particleSize: size }),
  setSpeedMultiplier: (multiplier) => set({ speedMultiplier: multiplier }),
  setSelectedPoint: (point) => set({ selectedPoint: point }),
  resetCamera: () => set((state) => ({ cameraResetKey: state.cameraResetKey + 1 })),

  fetchLayers: async () => {
    try {
      const layers = await api.getLayers();
      set({ layers });
    } catch (error) {
      console.error('Failed to fetch layers:', error);
    }
  },

  fetchParticles: async (time) => {
    try {
      const particles = await api.getParticles(time);
      set({ particles });
    } catch (error) {
      console.error('Failed to fetch particles:', error);
    }
  },

  fetchVectorField: async () => {
    try {
      const vectorField = await api.getVectorField();
      set({ vectorField });
    } catch (error) {
      console.error('Failed to fetch vector field:', error);
    }
  },

  queryPoint: async (x, y, z) => {
    try {
      const result = await api.queryPoint(x, y, z);
      set({ selectedPoint: result });
    } catch (error) {
      console.error('Failed to query point:', error);
    }
  },
}));
