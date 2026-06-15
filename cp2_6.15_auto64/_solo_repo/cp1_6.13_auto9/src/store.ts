import { create } from 'zustand';
import type { Wall, PlacedExhibit, LightSource, SelectedElement, Rotation } from '@/types';

interface GalleryStore {
  walls: Wall[];
  exhibits: PlacedExhibit[];
  lights: LightSource[];
  selectedElement: SelectedElement | null;
  zoom: number;

  addWall: () => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  removeWall: (id: string) => void;
  rotateWall: (id: string) => void;

  addExhibit: (exhibit: Omit<PlacedExhibit, 'id'>) => void;
  updateExhibit: (id: string, updates: Partial<PlacedExhibit>) => void;
  removeExhibit: (id: string) => void;

  addLight: (x: number, y: number) => void;
  updateLight: (id: string, updates: Partial<LightSource>) => void;
  removeLight: (id: string) => void;

  selectElement: (element: SelectedElement | null) => void;
  setZoom: (zoom: number) => void;
}

let nextId = 1;
function genId(prefix: string): string {
  return `${prefix}-${nextId++}`;
}

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  walls: [],
  exhibits: [],
  lights: [],
  selectedElement: null,
  zoom: 1,

  addWall: () => {
    const wall: Wall = {
      id: genId('wall'),
      x: 100,
      y: 100,
      width: 200,
      height: 20,
      rotation: 0,
      isSnapping: false,
    };
    set((state) => ({ walls: [...state.walls, wall] }));
  },

  updateWall: (id, updates) => {
    set((state) => ({
      walls: state.walls.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }));
  },

  removeWall: (id) => {
    set((state) => ({
      walls: state.walls.filter((w) => w.id !== id),
      selectedElement:
        state.selectedElement?.type === 'wall' && state.selectedElement.id === id
          ? null
          : state.selectedElement,
    }));
  },

  rotateWall: (id) => {
    set((state) => ({
      walls: state.walls.map((w) => {
        if (w.id !== id) return w;
        const nextRot: Record<Rotation, Rotation> = { 0: 90, 90: 180, 180: 270, 270: 0 };
        const offsetX = (w.width - w.height) / 2;
        const offsetY = (w.height - w.width) / 2;
        return {
          ...w,
          rotation: nextRot[w.rotation],
          width: w.height,
          height: w.width,
          x: w.x + offsetX,
          y: w.y + offsetY,
          isSnapping: false,
        };
      }),
    }));
  },

  addExhibit: (exhibit) => {
    const placed: PlacedExhibit = { ...exhibit, id: genId('placed') };
    set((state) => ({ exhibits: [...state.exhibits, placed] }));
  },

  updateExhibit: (id, updates) => {
    set((state) => ({
      exhibits: state.exhibits.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  },

  removeExhibit: (id) => {
    set((state) => ({
      exhibits: state.exhibits.filter((e) => e.id !== id),
      selectedElement:
        state.selectedElement?.type === 'exhibit' && state.selectedElement.id === id
          ? null
          : state.selectedElement,
    }));
  },

  addLight: (x, y) => {
    const light: LightSource = { id: genId('light'), x, y, intensity: 70 };
    set((state) => ({ lights: [...state.lights, light] }));
  },

  updateLight: (id, updates) => {
    set((state) => ({
      lights: state.lights.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }));
  },

  removeLight: (id) => {
    set((state) => ({
      lights: state.lights.filter((l) => l.id !== id),
      selectedElement:
        state.selectedElement?.type === 'light' && state.selectedElement.id === id
          ? null
          : state.selectedElement,
    }));
  },

  selectElement: (element) => {
    set({ selectedElement: element });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.5, Math.min(2, zoom)) });
  },
}));
