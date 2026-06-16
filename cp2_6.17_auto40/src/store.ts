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
  hoverPoint: Point | null;
  nearestGridPoint: Point | null;
  highlightedCrease: Crease | null;
  isDraggingRotation: boolean;
  rotationStartAngle: number;
  foldStartState: PaperState | null;
  foldEndState: PaperState | null;

  setToolMode: (mode: ToolMode) => void;
  setRotation: (angle: number) => void;
  setIsRotating: (val: boolean) => void;
  setOffsetX: (offset: number) => void;
  setOffsetY: (offset: number) => void;
  setHoverPoint: (point: Point | null) => void;
  setNearestGridPoint: (point: Point | null) => void;
  setHighlightedCrease: (crease: Crease | null) => void;
  setRotationWithSnap: (angle: number) => void;
  setIsDraggingRotation: (val: boolean) => void;
  setRotationStartAngle: (val: number) => void;
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

export const SPECIAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const SNAP_THRESHOLD = 2;

function snapToSpecialAngle(angle: number): number {
  for (const special of SPECIAL_ANGLES) {
    const diff = Math.abs(angle - special);
    if (diff <= SNAP_THRESHOLD) {
      return special;
    }
    const diff360 = Math.abs(angle - (special + 360));
    if (diff360 <= SNAP_THRESHOLD) {
      return special;
    }
    const diffNeg = Math.abs(angle - (special - 360));
    if (diffNeg <= SNAP_THRESHOLD) {
      return special;
    }
  }
  return angle;
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
  hoverPoint: null,
  nearestGridPoint: null,
  highlightedCrease: null,
  isDraggingRotation: false,
  rotationStartAngle: 0,
  foldStartState: null,
  foldEndState: null,

  setToolMode: (mode) => set({ toolMode: mode, selectedPoints: [], currentCrease: null, hoverPoint: null, nearestGridPoint: null, highlightedCrease: null }),
  setRotation: (angle) => set({ rotation: angle }),
  setIsRotating: (val) => set({ isRotating: val }),
  setOffsetX: (offset) => set({ offsetX: offset }),
  setOffsetY: (offset) => set({ offsetY: offset }),
  setHoverPoint: (point) => set({ hoverPoint: point }),
  setNearestGridPoint: (point) => set({ nearestGridPoint: point }),
  setHighlightedCrease: (crease) => set({ highlightedCrease: crease }),
  setRotationWithSnap: (angle) => {
    const snapped = snapToSpecialAngle(angle);
    set({ rotation: snapped });
  },
  setIsDraggingRotation: (val) => set({ isDraggingRotation: val }),
  setRotationStartAngle: (val) => set({ rotationStartAngle: val }),

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

    const finalState = fold(paperState, currentCrease.start, currentCrease.end, foldSide);

    set({ isAnimating: true, animationProgress: 0, foldStartState: paperState, foldEndState: finalState, currentCrease: currentCrease });

    const startTime = performance.now();
    const duration = 300;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

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
