import { create } from 'zustand';
import type {
  Pipeline,
  PipelineType,
  Point3D,
  CollisionPoint,
  PresetScheme,
} from '@/data/types';
import { PIPELINE_CONFIGS, MIN_SEGMENT_LENGTH, MAX_SEGMENT_LENGTH } from '@/data/types';
import { detectCollisions } from '@/render/collisionDetector';

interface PipelineStore {
  pipelines: Pipeline[];
  collisions: CollisionPoint[];
  selectedPipelineId: string | null;
  hoveredCollisionId: string | null;
  activePipelineType: PipelineType;
  currentScheme: 'A' | 'B' | 'C' | null;
  isDrawing: boolean;
  drawingStart: Point3D | null;
  drawingPreview: Point3D | null;
  drawingWarning: boolean;
  drawingDistance: number;

  setActiveType: (type: PipelineType) => void;
  addPipeline: (pipeline: Pipeline) => void;
  removePipeline: (id: string) => void;
  selectPipeline: (id: string | null) => void;
  loadPreset: (scheme: PresetScheme) => void;
  clearAll: () => void;
  setHoveredCollision: (id: string | null) => void;
  toggleCollisionResolved: (id: string) => void;
  startDrawing: (point: Point3D) => void;
  updateDrawingPreview: (point: Point3D | null, distance?: number, warning?: boolean) => void;
  finishDrawing: (point: Point3D) => void;
  cancelDrawing: () => void;
  runCollisionDetection: () => void;
}

let idCounter = 0;
const genId = () => `p_${++idCounter}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  pipelines: [],
  collisions: [],
  selectedPipelineId: null,
  hoveredCollisionId: null,
  activePipelineType: 'water',
  currentScheme: null,
  isDrawing: false,
  drawingStart: null,
  drawingPreview: null,
  drawingWarning: false,
  drawingDistance: 0,

  setActiveType: (type) => set({ activePipelineType: type }),

  addPipeline: (pipeline) => {
    set((state) => {
      const newPipelines = [...state.pipelines, { ...pipeline, createdAt: Date.now() }];
      const newCollisions = detectCollisions(newPipelines);
      return { pipelines: newPipelines, collisions: newCollisions };
    });
  },

  removePipeline: (id) => {
    set((state) => {
      const newPipelines = state.pipelines.filter((p) => p.id !== id);
      const newCollisions = detectCollisions(newPipelines);
      const newSelected = state.selectedPipelineId === id ? null : state.selectedPipelineId;
      return { pipelines: newPipelines, collisions: newCollisions, selectedPipelineId: newSelected };
    });
  },

  selectPipeline: (id) => set({ selectedPipelineId: id }),

  loadPreset: (scheme) => {
    const now = Date.now();
    const spacedPipelines = scheme.pipelines.map((p, i) => ({
      ...p,
      id: genId(),
      visible: true,
      createdAt: now + i * 50,
    }));
    const newCollisions = detectCollisions(spacedPipelines);
    set({
      pipelines: spacedPipelines,
      collisions: newCollisions,
      currentScheme: scheme.id,
      selectedPipelineId: null,
      isDrawing: false,
      drawingStart: null,
      drawingPreview: null,
    });
  },

  clearAll: () => set({
    pipelines: [],
    collisions: [],
    currentScheme: null,
    selectedPipelineId: null,
    isDrawing: false,
    drawingStart: null,
    drawingPreview: null,
  }),

  setHoveredCollision: (id) => set({ hoveredCollisionId: id }),

  toggleCollisionResolved: (id) => {
    set((state) => ({
      collisions: state.collisions.map((c) =>
        c.id === id ? { ...c, resolved: !c.resolved } : c
      ),
    }));
  },

  startDrawing: (point) => set({
    isDrawing: true,
    drawingStart: point,
    drawingPreview: point,
    drawingWarning: false,
    drawingDistance: 0,
  }),

  updateDrawingPreview: (point, distance = 0, warning = false) => set({
    drawingPreview: point,
    drawingDistance: distance,
    drawingWarning: warning,
  }),

  finishDrawing: (point) => {
    const state = get();
    if (!state.drawingStart) return;

    const start = state.drawingStart;
    const end = point;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (length < MIN_SEGMENT_LENGTH) {
      set({ isDrawing: false, drawingStart: null, drawingPreview: null });
      return;
    }

    const clampedEnd = length > MAX_SEGMENT_LENGTH
      ? {
          x: start.x + (dx / length) * MAX_SEGMENT_LENGTH,
          y: end.y,
          z: start.z + (dz / length) * MAX_SEGMENT_LENGTH,
        }
      : end;

    const nodes = [start, clampedEnd];
    const newPipeline: Pipeline = {
      id: genId(),
      type: state.activePipelineType,
      segments: [{
        id: genId(),
        start,
        end: clampedEnd,
      }],
      nodes,
      depth: start.y,
      visible: true,
      createdAt: Date.now(),
    };

    set((s) => {
      const newPipelines = [...s.pipelines, newPipeline];
      const newCollisions = detectCollisions(newPipelines);
      return {
        pipelines: newPipelines,
        collisions: newCollisions,
        isDrawing: false,
        drawingStart: null,
        drawingPreview: null,
        drawingWarning: false,
        drawingDistance: 0,
      };
    });
    void PIPELINE_CONFIGS;
  },

  cancelDrawing: () => set({
    isDrawing: false,
    drawingStart: null,
    drawingPreview: null,
    drawingWarning: false,
    drawingDistance: 0,
  }),

  runCollisionDetection: () => {
    const state = get();
    const newCollisions = detectCollisions(state.pipelines);
    set({ collisions: newCollisions });
  },
}));
