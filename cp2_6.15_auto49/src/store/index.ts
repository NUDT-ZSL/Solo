import { create } from 'zustand';

export interface Annotation {
  id: number;
  x: number;
  y: number;
  z: number;
  text: string;
  lithology: string;
  created_at?: string;
}

export interface QueryPoint {
  x: number;
  y: number;
  z: number;
  lithology: string;
  confidence: number;
}

export interface RippleData {
  id: number;
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface AppState {
  cutX: number | null;
  cutZ: number | null;
  setCutX: (v: number | null) => void;
  setCutZ: (v: number | null) => void;

  annotations: Annotation[];
  addAnnotation: (a: Annotation) => void;
  removeAnnotation: (id: number) => void;
  setAnnotations: (list: Annotation[]) => void;

  queryPoint: QueryPoint | null;
  setQueryPoint: (p: QueryPoint | null) => void;

  ripples: RippleData[];
  addRipple: (r: RippleData) => void;
  removeRipple: (id: number) => void;
}

export const STRATUM = {
  width: 200,
  depth: 200,
  height: 100,
  centerX: 0,
  centerZ: 0,
  yTop: -50,
  yBottom: -150,
};

export const useStore = create<AppState>((set) => ({
  cutX: null,
  cutZ: null,
  setCutX: (v) => set({ cutX: v }),
  setCutZ: (v) => set({ cutZ: v }),

  annotations: [],
  addAnnotation: (a) => set((s) => ({ annotations: [a, ...s.annotations] })),
  removeAnnotation: (id) => set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),
  setAnnotations: (list) => set({ annotations: list }),

  queryPoint: null,
  setQueryPoint: (p) => set({ queryPoint: p }),

  ripples: [],
  addRipple: (r) => set((s) => ({ ripples: [...s.ripples, r] })),
  removeRipple: (id) => set((s) => ({ ripples: s.ripples.filter((r) => r.id !== id) })),
}));
