import { create } from 'zustand';
import { FragmentData, processImage, loadImageFromFile } from './ImageProcessor';
import { FragmentState, Particle, scatterFragments, checkSnap, createParticles, updateParticles, updateFragmentPhysics, hitTest } from './FragmentEngine';

interface PuzzleStore {
  phase: 'idle' | 'playing' | 'completed';
  image: HTMLImageElement | null;
  fragmentData: FragmentData[];
  fragmentStates: FragmentState[];
  particles: Particle[];
  gridCols: number;
  gridRows: number;
  snapThreshold: number;
  completionAlpha: number;
  draggingId: number | null;
  dragOffsetX: number;
  dragOffsetY: number;
  canvasWidth: number;
  canvasHeight: number;
  puzzleOffsetX: number;
  puzzleOffsetY: number;
  puzzleScale: number;

  loadImage: (file: File) => Promise<void>;
  setCanvasSize: (w: number, h: number) => void;
  startDrag: (fragmentId: number, offsetX: number, offsetY: number) => void;
  updateDrag: (mouseX: number, mouseY: number) => void;
  endDrag: () => void;
  reset: () => void;
  tick: (dt: number) => void;
  setGridSize: (cols: number, rows: number) => void;
}

export const usePuzzleStore = create<PuzzleStore>((set, get) => ({
  phase: 'idle',
  image: null,
  fragmentData: [],
  fragmentStates: [],
  particles: [],
  gridCols: 6,
  gridRows: 6,
  snapThreshold: 30,
  completionAlpha: 0,
  draggingId: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  canvasWidth: 0,
  canvasHeight: 0,
  puzzleOffsetX: 0,
  puzzleOffsetY: 0,
  puzzleScale: 1,

  loadImage: async (file: File) => {
    const img = await loadImageFromFile(file);
    const { gridCols, gridRows, canvasWidth, canvasHeight } = get();
    const fragmentData = processImage(img, gridCols, gridRows);

    const scale = Math.min(
      (canvasWidth * 0.5) / img.width,
      (canvasHeight * 0.5) / img.height,
      1
    );
    const puzzleOffsetX = (canvasWidth - img.width * scale) / 2;
    const puzzleOffsetY = (canvasHeight - img.height * scale) / 2;

    const scaledData = fragmentData.map(d => ({
      ...d,
      center: { x: d.center.x * scale + puzzleOffsetX, y: d.center.y * scale + puzzleOffsetY },
      vertices: d.vertices.map(v => ({ x: v.x * scale, y: v.y * scale })),
      width: d.width * scale,
      height: d.height * scale,
      sourceX: d.sourceX,
      sourceY: d.sourceY,
    }));

    const states = scatterFragments(scaledData, canvasWidth, canvasHeight, 50);

    set({
      phase: 'playing',
      image: img,
      fragmentData: scaledData,
      fragmentStates: states,
      particles: [],
      completionAlpha: 0,
      puzzleScale: scale,
      puzzleOffsetX,
      puzzleOffsetY,
    });
  },

  setCanvasSize: (w: number, h: number) => {
    set({ canvasWidth: w, canvasHeight: h });
  },

  startDrag: (fragmentId: number, offsetX: number, offsetY: number) => {
    set(state => ({
      draggingId: fragmentId,
      dragOffsetX: offsetX,
      dragOffsetY: offsetY,
      fragmentStates: state.fragmentStates.map(s =>
        s.id === fragmentId ? { ...s, dragging: true } : s
      ),
    }));
  },

  updateDrag: (mouseX: number, mouseY: number) => {
    const { draggingId, dragOffsetX, dragOffsetY } = get();
    if (draggingId === null) return;

    const targetX = mouseX - dragOffsetX;
    const targetY = mouseY - dragOffsetY;

    set(state => ({
      fragmentStates: state.fragmentStates.map(s =>
        s.id === draggingId ? { ...s, targetX, targetY } : s
      ),
    }));
  },

  endDrag: () => {
    const { draggingId, fragmentStates, fragmentData, snapThreshold } = get();
    if (draggingId === null) return;

    const state = fragmentStates.find(s => s.id === draggingId);
    const data = fragmentData.find(d => d.id === draggingId);
    if (!state || !data) {
      set({ draggingId: null });
      return;
    }

    const snapped = checkSnap(state, data.center, snapThreshold);

    if (snapped) {
      const newStates = fragmentStates.map(s => {
        if (s.id === draggingId) {
          return {
            ...s,
            snapped: true,
            x: data.center.x,
            y: data.center.y,
            targetX: data.center.x,
            targetY: data.center.y,
            rotation: 0,
            velocityX: 0,
            velocityY: 0,
            dragging: false,
            flashAlpha: 1,
            connectionAlpha: 1,
          };
        }
        return s;
      });

      const allSnapped = newStates.every(s => s.snapped);
      const { canvasWidth, canvasHeight, image } = get();

      let particles: Particle[] = [];
      if (allSnapped && image) {
        const colors = fragmentData.slice(0, 10).map(d => d.color);
        particles = createParticles(colors, canvasWidth / 2, canvasHeight / 2, 200);
      }

      set({
        fragmentStates: newStates,
        draggingId: null,
        phase: allSnapped ? 'completed' : 'playing',
        particles,
      });
    } else {
      set(state => ({
        fragmentStates: state.fragmentStates.map(s =>
          s.id === draggingId ? { ...s, dragging: false } : s
        ),
        draggingId: null,
      }));
    }
  },

  reset: () => {
    const { fragmentData, canvasWidth, canvasHeight } = get();
    if (fragmentData.length === 0) return;
    const states = scatterFragments(fragmentData, canvasWidth, canvasHeight, 50);
    set({
      phase: 'playing',
      fragmentStates: states,
      particles: [],
      completionAlpha: 0,
      draggingId: null,
    });
  },

  tick: (dt: number) => {
    const { fragmentStates, draggingId, particles, phase } = get();

    let newStates = fragmentStates.map(s => {
      if (s.snapped || s.id === draggingId) {
        let updated = s;
        if (s.id === draggingId) {
          updated = updateFragmentPhysics(updated, dt);
        }
        if (updated.flashAlpha > 0) {
          updated = { ...updated, flashAlpha: Math.max(0, updated.flashAlpha - dt * 2) };
        }
        return updated;
      }
      let updated = updateFragmentPhysics(s, dt);
      if (updated.flashAlpha > 0) {
        updated = { ...updated, flashAlpha: Math.max(0, updated.flashAlpha - dt * 2) };
      }
      return updated;
    });

    let newParticles = updateParticles(particles, dt);
    let newCompletionAlpha = get().completionAlpha;
    if (phase === 'completed') {
      newCompletionAlpha = Math.min(1, newCompletionAlpha + dt * 0.5);
    }

    set({
      fragmentStates: newStates,
      particles: newParticles,
      completionAlpha: newCompletionAlpha,
    });
  },

  setGridSize: (cols: number, rows: number) => {
    set({ gridCols: cols, gridRows: rows });
  },
}));
