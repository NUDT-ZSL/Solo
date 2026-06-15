import { create } from 'zustand';
import type { CityName, MetricType } from '@/data/mockData';

interface MeteoState {
  isLoaded: boolean;
  sceneRotation: number;
  selectedCity: CityName;
  compareMode: boolean;
  selectedMetric: MetricType;
  setIsLoaded: (loaded: boolean) => void;
  setSceneRotation: (rotation: number) => void;
  setSelectedCity: (city: CityName) => void;
  setCompareMode: (enabled: boolean) => void;
  setSelectedMetric: (metric: MetricType) => void;
}

export const useMeteoStore = create<MeteoState>((set) => ({
  isLoaded: false,
  sceneRotation: 0,
  selectedCity: 'beijing',
  compareMode: false,
  selectedMetric: 'temperature',
  setIsLoaded: (loaded) => set({ isLoaded: loaded }),
  setSceneRotation: (rotation) => set({ sceneRotation: rotation }),
  setSelectedCity: (city) => set({ selectedCity: city }),
  setCompareMode: (enabled) => set({ compareMode: enabled }),
  setSelectedMetric: (metric) => set({ selectedMetric: metric }),
}));
