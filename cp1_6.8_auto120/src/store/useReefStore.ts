import { create } from 'zustand';

export interface CoralData {
  id: string;
  species: string;
  depth: number;
  health: string;
  colorType: 'pink' | 'purple' | 'orange' | 'green';
  position: [number, number, number];
  scale: number;
  tentaclePhase: number;
}

interface ReefState {
  currentSpeed: number;
  fishDensity: number;
  lightIntensity: number;
  selectedCoral: CoralData | null;
  setCurrentSpeed: (v: number) => void;
  setFishDensity: (v: number) => void;
  setLightIntensity: (v: number) => void;
  setSelectedCoral: (coral: CoralData | null) => void;
}

export const useReefStore = create<ReefState>((set) => ({
  currentSpeed: 1.0,
  fishDensity: 0.5,
  lightIntensity: 1.0,
  selectedCoral: null,
  setCurrentSpeed: (v) => set({ currentSpeed: v }),
  setFishDensity: (v) => set({ fishDensity: v }),
  setLightIntensity: (v) => set({ lightIntensity: v }),
  setSelectedCoral: (coral) => set({ selectedCoral: coral }),
}));
