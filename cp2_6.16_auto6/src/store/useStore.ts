import { create } from 'zustand';

export interface MarkerPoint {
  id: number;
  x: number;
  z: number;
  createdAt: number;
}

interface AppState {
  terrainScale: number;
  bumpDecay: number;
  colorBlendIntensity: number;
  cameraAngle: number;
  cameraZoom: number;
  markers: MarkerPoint[];
  isCameraReady: boolean;
  handLandmarks: any[] | null;
  gesture: string | null;
  handPosition: { x: number; y: number } | null;
  isPinch: boolean;
  isPointing: boolean;

  setTerrainScale: (scale: number) => void;
  setBumpDecay: (decay: number) => void;
  setColorBlendIntensity: (intensity: number) => void;
  setCameraAngle: (angle: number) => void;
  setCameraZoom: (zoom: number) => void;
  addMarker: (x: number, z: number) => void;
  setCameraReady: (ready: boolean) => void;
  setHandLandmarks: (landmarks: any[] | null) => void;
  setGesture: (gesture: string | null) => void;
  setHandPosition: (pos: { x: number; y: number } | null) => void;
  setIsPinch: (pinch: boolean) => void;
  setIsPointing: (pointing: boolean) => void;
}

let markerIdCounter = 0;

export const useAppStore = create<AppState>((set) => ({
  terrainScale: 1.0,
  bumpDecay: 0.6,
  colorBlendIntensity: 70,
  cameraAngle: 0,
  cameraZoom: 1.5,
  markers: [],
  isCameraReady: false,
  handLandmarks: null,
  gesture: null,
  handPosition: null,
  isPinch: false,
  isPointing: false,

  setTerrainScale: (scale) => set({ terrainScale: scale }),
  setBumpDecay: (decay) => set({ bumpDecay: decay }),
  setColorBlendIntensity: (intensity) => set({ colorBlendIntensity: intensity }),
  setCameraAngle: (angle) => set({ cameraAngle: angle }),
  setCameraZoom: (zoom) => set({ cameraZoom: zoom }),
  addMarker: (x, z) =>
    set((state) => {
      const newMarker: MarkerPoint = {
        id: markerIdCounter++,
        x,
        z,
        createdAt: Date.now(),
      };
      const newMarkers = [...state.markers, newMarker];
      if (newMarkers.length > 5) {
        newMarkers.shift();
      }
      return { markers: newMarkers };
    }),
  setCameraReady: (ready) => set({ isCameraReady: ready }),
  setHandLandmarks: (landmarks) => set({ handLandmarks: landmarks }),
  setGesture: (gesture) => set({ gesture }),
  setHandPosition: (pos) => set({ handPosition: pos }),
  setIsPinch: (pinch) => set({ isPinch: pinch }),
  setIsPointing: (pointing) => set({ isPointing: pointing }),
}));
