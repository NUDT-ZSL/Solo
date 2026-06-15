import { create } from 'zustand';
import type { CityName, MetricType, WeatherData } from '@/data/mockData';
import { generateMockData, CITIES, METRIC_CONFIG } from '@/data/mockData';

interface PopupData {
  data: WeatherData;
  position: { x: number; y: number };
  city: CityName;
}

interface MeteoState {
  selectedCity: CityName;
  selectedMetric: MetricType;
  currentDay: number;
  compareMode: boolean;
  compareCity: CityName;
  opacity: number;
  data: Record<CityName, WeatherData[]>;
  loading: boolean;
  isLoaded: boolean;
  sceneRotation: number;
  popupData: PopupData | null;
  animatingDay: number;
  targetRotation: number;
  targetDay: number;
  setSelectedCity: (city: CityName) => void;
  setSelectedMetric: (metric: MetricType) => void;
  setCurrentDay: (day: number) => void;
  toggleCompareMode: () => void;
  setCompareCity: (city: CityName) => void;
  setOpacity: (opacity: number) => void;
  initData: () => void;
  showPopup: (data: WeatherData, position: { x: number; y: number }, city: CityName) => void;
  hidePopup: () => void;
  setIsLoaded: (loaded: boolean) => void;
  setSceneRotation: (rotation: number) => void;
  resetView: () => void;
  setAnimatingDay: (day: number) => void;
}

export const useMeteoStore = create<MeteoState>((set) => ({
  selectedCity: 'beijing',
  selectedMetric: 'temperature',
  currentDay: 6,
  compareMode: false,
  compareCity: 'shanghai',
  opacity: 0.8,
  data: {} as Record<CityName, WeatherData[]>,
  loading: true,
  isLoaded: false,
  sceneRotation: 0,
  popupData: null,
  animatingDay: 6,
  targetRotation: 0,
  targetDay: 6,

  setSelectedCity: (city: CityName) => {
    set((state) => {
      const cityKeys = Object.keys(CITIES) as CityName[];
      const currentIndex = cityKeys.indexOf(state.selectedCity);
      const targetIndex = cityKeys.indexOf(city);
      const diff = targetIndex - currentIndex;
      const newTargetRotation = state.targetRotation + diff * (Math.PI * 2 / 3);
      return {
        selectedCity: city,
        targetRotation: newTargetRotation,
      };
    });
  },

  setSelectedMetric: (metric: MetricType) => set({ selectedMetric: metric }),

  setCurrentDay: (day: number) => set({ targetDay: day, currentDay: day }),

  toggleCompareMode: () => set((state) => ({ compareMode: !state.compareMode })),

  setCompareCity: (city: CityName) => set({ compareCity: city }),

  setOpacity: (opacity: number) => set({ opacity: Math.max(0.3, Math.min(1.0, opacity)) }),

  initData: () => {
    const cityNames = Object.keys(CITIES) as CityName[];
    const data = {} as Record<CityName, WeatherData[]>;
    cityNames.forEach((city) => {
      data[city] = generateMockData(city, 7);
    });
    set({ data, loading: false });
  },

  showPopup: (data: WeatherData, position: { x: number; y: number }, city: CityName) =>
    set({ popupData: { data, position, city } }),

  hidePopup: () => set({ popupData: null }),

  setIsLoaded: (loaded: boolean) => set({ isLoaded: loaded }),

  setSceneRotation: (rotation: number) => set({ sceneRotation: rotation, targetRotation: rotation }),

  resetView: () =>
    set({
      selectedCity: 'beijing',
      selectedMetric: 'temperature',
      currentDay: 6,
      targetDay: 6,
      animatingDay: 6,
      compareMode: false,
      compareCity: 'shanghai',
      opacity: 0.8,
      sceneRotation: 0,
      targetRotation: 0,
      popupData: null,
    }),

  setAnimatingDay: (day: number) => set({ animatingDay: day }),
}));

useMeteoStore.getState().initData();
