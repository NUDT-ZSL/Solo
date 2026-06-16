import { create } from "zustand";
import type { Point, PaperState, Crease } from "./FoldEngine";
import { createDefaultPaperState, fold, polygonArea } from "./FoldEngine";

export type ToolMode = "select" | "fold" | "rotate";

export interface FoldRecord {
  id: number;
  timestamp: string;
  creaseStart: Point;
  creaseEnd: Point;
  snapshot: PaperState;
}

interface OrigamiStore {
  toolMode: ToolMode;
  rotation: number;
  offsetX: number;
  offsetY: number;
  isRotating: boolean;
  paperState: PaperState;
  selectedPoints: Point[];
  currentCrease: Crease | null;
  foldHistory: FoldRecord[];
  isAnimating: boolean;
  animationProgress: number;
  showExportModal: boolean;

  setToolMode: (mode: ToolMode) => void;
  setRotation: (angle: number) => void;
  setIsRotating: (val: boolean) => void;
  setOffsetX: (offset: number) => void;
  setOffsetY: (offset: number) => void;
  selectGridPoint: (point: Point) => void;
  clearSelection: () => void;
  executeFold: (foldSide: Point) => void;
  revertToState: (id: number) => void;
  setShowExportModal: (show: boolean) => void;
  setIsAnimating: (val: boolean) => void;
  setAnimationProgress: (val: number) => void;
  getCurrentArea: () => number;
  getFoldCount: () => number;
}

export const useOrigamiStore = create<OrigamiStore>((set, get) => ({
  toolMode: "fold",
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  isRotating: false,
  paperState: createDefaultPaperState(),
  selectedPoints: [],
  currentCrease: null,
  foldHistory: [],
  isAnimating: false,
  animationProgress: 0,
  showExportModal: false,

  setToolMode: (mode) => set({ toolMode: mode, selectedPoints: [], currentCrease: null }),
  setRotation: (angle) => set({ rotation: angle }),
  setIsRotating: (val) => set({ isRotating: val }),
  setOffsetX: (offset) => set({ offsetX: offset }),
  setOffsetY: (offset) => set({ offsetY: offset }),

  selectGridPoint: (point) => {
    const { selectedPoints, paperState } = get();
    if (selectedPoints.length >= 2) return;

    const newSelected = [...selectedPoints, point];
    if (newSelected.length === 2) {
      const crease: Crease = {
        start: newSelected[0],
        end: newSelected[1],
        isFolded: false,
      };
      set({ selectedPoints: newSelected, currentCrease: crease });
    } else {
      set({ selectedPoints: newSelected });
    }
  },

  clearSelection: () => set({ selectedPoints: [], currentCrease: null }),

  executeFold: (foldSide) => {
    const { currentCrease, paperState, foldHistory } = get();
    if (!currentCrease) return;

    set({ isAnimating: true, animationProgress: 0 });

    const startTime = performance.now();
    const duration = 400;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      set({ animationProgress: eased });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const newState = fold(paperState, currentCrease.start, currentCrease.end, foldSide);
        const now2 = new Date();
        const timeStr = `${String(now2.getHours()).padStart(2, "0")}:${String(now2.getMinutes()).padStart(2, "0")}:${String(now2.getSeconds()).padStart(2, "0")}`;
        const record: FoldRecord = {
          id: foldHistory.length + 1,
          timestamp: timeStr,
          creaseStart: currentCrease.start,
          creaseEnd: currentCrease.end,
          snapshot: newState,
        };
        set({
          paperState: newState,
          foldHistory: [...foldHistory, record],
          selectedPoints: [],
          currentCrease: null,
          isAnimating: false,
          animationProgress: 0,
        });
      }
    };

    requestAnimationFrame(animate);
  },

  revertToState: (id) => {
    const { foldHistory, paperState } = get();
    const targetRecord = foldHistory.find((r) => r.id === id);
    if (!targetRecord) return;

    set({ isAnimating: true, animationProgress: 1 });
    const startTime = performance.now();
    const duration = 200;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);

      set({ animationProgress: 1 - eased });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const newHistory = foldHistory.filter((r) => r.id <= id);
        set({
          paperState: targetRecord.snapshot,
          foldHistory: newHistory,
          isAnimating: false,
          animationProgress: 0,
          selectedPoints: [],
          currentCrease: null,
        });
      }
    };

    requestAnimationFrame(animate);
  },

  setShowExportModal: (show) => set({ showExportModal: show }),
  setIsAnimating: (val) => set({ isAnimating: val }),
  setAnimationProgress: (val) => set({ animationProgress: val }),

  getCurrentArea: () => {
    const { paperState } = get();
    let total = 0;
    for (const layer of paperState.layers) {
      total += polygonArea(layer.vertices);
    }
    return Math.round(total);
  },

  getFoldCount: () => {
    const { foldHistory } = get();
    return foldHistory.length;
  },
}));
