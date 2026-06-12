import { create } from 'zustand';
import type { Layer, Fossil, AnimationSpeed } from '@/types';

interface StrataState {
  layers: Layer[];
  selectedLayerId: string | null;
  fossils: Fossil[];
  viewingFossil: Fossil | null;
  fossilRotating: boolean;
  timeline: number;
  animationSpeed: AnimationSpeed;
  isMobile: boolean;
  showFossilDetail: boolean;
  cameraResetTrigger: number;
  setLayers: (layers: Layer[]) => void;
  selectLayer: (layerId: string | null) => void;
  setFossils: (fossils: Fossil[]) => void;
  viewFossil: (fossil: Fossil | null) => void;
  toggleFossilRotation: () => void;
  setTimeline: (value: number) => void;
  setAnimationSpeed: (speed: AnimationSpeed) => void;
  setIsMobile: (value: boolean) => void;
  setShowFossilDetail: (value: boolean) => void;
  resetCamera: () => void;
}

export const useStrataStore = create<StrataState>((set) => ({
  layers: [],
  selectedLayerId: null,
  fossils: [],
  viewingFossil: null,
  fossilRotating: true,
  timeline: 100,
  animationSpeed: 1,
  isMobile: false,
  showFossilDetail: false,
  cameraResetTrigger: 0,
  setLayers: (layers) => set({ layers }),
  selectLayer: (layerId) => set({ selectedLayerId: layerId }),
  setFossils: (fossils) => set({ fossils }),
  viewFossil: (fossil) => set({ viewingFossil: fossil }),
  toggleFossilRotation: () => set((state) => ({ fossilRotating: !state.fossilRotating })),
  setTimeline: (value) => set({ timeline: value }),
  setAnimationSpeed: (speed) => set({ animationSpeed: speed }),
  setIsMobile: (value) => set({ isMobile: value }),
  setShowFossilDetail: (value) => set({ showFossilDetail: value }),
  resetCamera: () => set((state) => ({ cameraResetTrigger: state.cameraResetTrigger + 1 })),
}));
