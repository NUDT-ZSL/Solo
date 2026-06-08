import { create } from 'zustand';
import type { Annotation, Snapshot, ToolType, CompareSelection } from '@/types';

interface AppState {
  annotations: Annotation[];
  snapshots: Snapshot[];
  selectedAnnotationId: string | null;
  currentTool: ToolType;
  currentPage: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  onlineCount: number;
  showThumbnails: boolean;
  compareMode: boolean;
  compareSelection: CompareSelection;
  pdfFile: ArrayBuffer | null;
  isSamplePDF: boolean;

  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  moveAnnotation: (id: string, x: number, y: number) => void;
  deleteAnnotation: (id: string) => void;
  setSnapshots: (snapshots: Snapshot[]) => void;
  addSnapshot: (snapshot: Snapshot) => void;
  setSelectedAnnotationId: (id: string | null) => void;
  setCurrentTool: (tool: ToolType) => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  setOffsetX: (x: number) => void;
  setOffsetY: (y: number) => void;
  setOnlineCount: (count: number) => void;
  setShowThumbnails: (show: boolean) => void;
  setCompareMode: (mode: boolean) => void;
  setCompareSelection: (sel: CompareSelection) => void;
  setPdfFile: (file: ArrayBuffer | null) => void;
  setIsSamplePDF: (isSample: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  annotations: [],
  snapshots: [],
  selectedAnnotationId: null,
  currentTool: 'none',
  currentPage: 1,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  onlineCount: 1,
  showThumbnails: false,
  compareMode: false,
  compareSelection: { versionA: null, versionB: null },
  pdfFile: null,
  isSamplePDF: true,

  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation] })),
  moveAnnotation: (id, x, y) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, x, y } : a
      ),
    })),
  deleteAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })),
  setSnapshots: (snapshots) => set({ snapshots }),
  addSnapshot: (snapshot) =>
    set((state) => {
      const newSnapshots = [...state.snapshots, snapshot];
      if (newSnapshots.length > 5) {
        newSnapshots.shift();
      }
      return { snapshots: newSnapshots };
    }),
  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),
  setCurrentTool: (tool) => set({ currentTool: tool, selectedAnnotationId: null }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setScale: (scale) => set({ scale: Math.max(0.5, Math.min(2, scale)) }),
  setOffsetX: (x) => set({ offsetX: x }),
  setOffsetY: (y) => set({ offsetY: y }),
  setOnlineCount: (count) => set({ onlineCount: count }),
  setShowThumbnails: (show) => set({ showThumbnails: show }),
  setCompareMode: (mode) => set({ compareMode: mode }),
  setCompareSelection: (sel) => set({ compareSelection: sel }),
  setPdfFile: (file) => set({ pdfFile: file }),
  setIsSamplePDF: (isSample) => set({ isSamplePDF: isSample }),
}));
