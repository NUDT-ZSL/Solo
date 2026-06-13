import { create } from 'zustand';

export interface Viewport {
  name: string;
  width: number;
  height: number;
  icon: string;
}

export interface CaptureFrame {
  timestamp: number;
  screenshots: Record<string, string>;
}

export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  diffPercentage: number;
  domPath: string;
}

export interface DiffResult {
  diffImages: Record<string, string>;
  regions: DiffRegion[];
  totalDiffPixels: number;
  regionCount: number;
  maxRegionArea: number;
}

export const VIEWPORTS: Viewport[] = [
  { name: 'Mobile', width: 375, height: 667, icon: 'smartphone' },
  { name: 'Tablet', width: 768, height: 1024, icon: 'tablet' },
  { name: 'Laptop', width: 1280, height: 800, icon: 'laptop' },
  { name: 'Desktop', width: 1920, height: 1080, icon: 'monitor' },
];

interface AppState {
  targetUrl: string;
  crosshair: { nx: number; ny: number } | null;
  isRecording: boolean;
  captures: CaptureFrame[];
  selectedFrameIndex: number;
  isPaused: boolean;
  isDiffMode: boolean;
  diffResult: DiffResult | null;
  diffSourceA: string;
  diffSourceB: string;
  isLoading: boolean;

  setTargetUrl: (url: string) => void;
  setCrosshair: (pos: { nx: number; ny: number } | null) => void;
  setRecording: (v: boolean) => void;
  addCapture: (frame: CaptureFrame) => void;
  setSelectedFrameIndex: (i: number) => void;
  setPaused: (v: boolean) => void;
  setDiffMode: (v: boolean) => void;
  setDiffResult: (r: DiffResult | null) => void;
  setDiffSourceA: (v: string) => void;
  setDiffSourceB: (v: string) => void;
  setLoading: (v: boolean) => void;
  clearCaptures: () => void;
}

export const useStore = create<AppState>((set) => ({
  targetUrl: '',
  crosshair: null,
  isRecording: false,
  captures: [],
  selectedFrameIndex: -1,
  isPaused: false,
  isDiffMode: false,
  diffResult: null,
  diffSourceA: 'Mobile',
  diffSourceB: 'Desktop',
  isLoading: false,

  setTargetUrl: (url) => set({ targetUrl: url }),
  setCrosshair: (pos) => set({ crosshair: pos }),
  setRecording: (v) => set({ isRecording: v }),
  addCapture: (frame) =>
    set((s) => ({ captures: [...s.captures, frame] })),
  setSelectedFrameIndex: (i) => set({ selectedFrameIndex: i }),
  setPaused: (v) => set({ isPaused: v }),
  setDiffMode: (v) => set({ isDiffMode: v }),
  setDiffResult: (r) => set({ diffResult: r }),
  setDiffSourceA: (v) => set({ diffSourceA: v }),
  setDiffSourceB: (v) => set({ diffSourceB: v }),
  setLoading: (v) => set({ isLoading: v }),
  clearCaptures: () => set({ captures: [], selectedFrameIndex: -1 }),
}));
