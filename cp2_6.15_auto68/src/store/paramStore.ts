import { create } from 'zustand';

export interface Snapshot {
  id: string;
  imageData: string;
  aperture: number;
  shutter: string;
  focalLength: number;
  timestamp: number;
}

export const SHUTTER_SPEEDS = [
  '1/1000s', '1/500s', '1/250s', '1/125s', '1/60s',
  '1/30s', '1/15s', '1/8s', '1/4s', '1/2s', '1s'
];

export const APERTURE_MIN = 1.4;
export const APERTURE_MAX = 22;
export const APERTURE_DEFAULT = 5.6;
export const SHUTTER_DEFAULT = '1/125s';
export const FOCAL_MIN = 28;
export const FOCAL_MAX = 200;
export const FOCAL_DEFAULT = 50;

interface ParamState {
  aperture: number;
  shutter: string;
  focalLength: number;
  snapshots: Snapshot[];
  setAperture: (value: number) => void;
  setShutter: (value: string) => void;
  setFocalLength: (value: number) => void;
  resetParams: () => void;
  addSnapshot: (snapshot: Snapshot) => void;
  loadSnapshots: () => void;
}

export const useParamStore = create<ParamState>((set, get) => ({
  aperture: APERTURE_DEFAULT,
  shutter: SHUTTER_DEFAULT,
  focalLength: FOCAL_DEFAULT,
  snapshots: [],

  setAperture: (value) => set({ aperture: value }),
  setShutter: (value) => set({ shutter: value }),
  setFocalLength: (value) => set({ focalLength: value }),

  resetParams: () => set({
    aperture: APERTURE_DEFAULT,
    shutter: SHUTTER_DEFAULT,
    focalLength: FOCAL_DEFAULT,
  }),

  addSnapshot: (snapshot) => set((state) => ({
    snapshots: [snapshot, ...state.snapshots].slice(0, 20),
  })),

  loadSnapshots: () => {
    const { snapshots } = get();
    if (snapshots.length > 0) return;
  },
}));
