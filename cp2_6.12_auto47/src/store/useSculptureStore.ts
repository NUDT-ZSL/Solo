import { v4 as uuidv4 } from 'uuid';

export type GeometryType = 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus';

export interface GeometryItem {
  id: string;
  type: GeometryType;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  color: string;
}

export type PresetId = 'stack' | 'scatter' | 'ring' | null;

export interface SculptureState {
  geometries: GeometryItem[];
  selectedId: string | null;
  preset: PresetId;
  addGeometry: (type: GeometryType) => void;
  removeGeometry: (id: string) => void;
  updateGeometry: (id: string, updates: Partial<GeometryItem>) => void;
  selectGeometry: (id: string | null) => void;
  applyPreset: (preset: PresetId) => void;
  importConfig: (geometries: GeometryItem[], preset: PresetId) => void;
}

const TYPE_NAMES: Record<GeometryType, string> = {
  cube: '立方体',
  sphere: '球体',
  cylinder: '圆柱体',
  cone: '圆锥体',
  torus: '环面',
};

const DEFAULT_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe', '#fd79a8', '#00cec9'];

function getTypeCount(geometries: GeometryItem[], type: GeometryType): number {
  return geometries.filter(g => g.type === type).length + 1;
}

export const DEFAULT_GEOMETRIES: GeometryItem[] = [
  {
    id: uuidv4(),
    type: 'cube',
    name: '立方体-1',
    position: { x: 0, y: 0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1.0,
    color: '#ff6b6b',
  },
  {
    id: uuidv4(),
    type: 'sphere',
    name: '球体-1',
    position: { x: 1.5, y: 0.8, z: 0.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 0.8,
    color: '#4ecdc4',
  },
  {
    id: uuidv4(),
    type: 'cylinder',
    name: '圆柱体-1',
    position: { x: -1.2, y: 0.6, z: -0.8 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 0.7,
    color: '#45b7d1',
  },
  {
    id: uuidv4(),
    type: 'cone',
    name: '圆锥体-1',
    position: { x: 0.8, y: 0.7, z: -1.2 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 0.9,
    color: '#f9ca24',
  },
  {
    id: uuidv4(),
    type: 'torus',
    name: '环面-1',
    position: { x: -0.5, y: 1.2, z: 1.0 },
    rotation: { x: 30, y: 45, z: 0 },
    scale: 0.6,
    color: '#6c5ce7',
  },
];

import { create } from 'zustand';
import { applyPresetToGeometries } from '@/utils/sculpturePresets';

export const useSculptureStore = create<SculptureState>((set) => ({
  geometries: DEFAULT_GEOMETRIES,
  selectedId: null,
  preset: null,

  addGeometry: (type: GeometryType) => {
    const id = uuidv4();
    const count = getTypeCount(useSculptureStore.getState().geometries, type);
    const colorIndex = useSculptureStore.getState().geometries.length % DEFAULT_COLORS.length;
    const newGeo: GeometryItem = {
      id,
      type,
      name: `${TYPE_NAMES[type]}-${count}`,
      position: {
        x: Math.round((Math.random() * 6 - 3) * 10) / 10,
        y: Math.round((Math.random() * 3) * 10) / 10,
        z: Math.round((Math.random() * 6 - 3) * 10) / 10,
      },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1.0,
      color: DEFAULT_COLORS[colorIndex],
    };
    set((state) => ({
      geometries: [...state.geometries, newGeo],
      selectedId: id,
      preset: null,
    }));
  },

  removeGeometry: (id: string) => {
    set((state) => ({
      geometries: state.geometries.filter((g) => g.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      preset: null,
    }));
  },

  updateGeometry: (id: string, updates: Partial<GeometryItem>) => {
    set((state) => ({
      geometries: state.geometries.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
    }));
  },

  selectGeometry: (id: string | null) => {
    set({ selectedId: id });
  },

  applyPreset: (preset: PresetId) => {
    if (!preset) return;
    set((state) => ({
      geometries: applyPresetToGeometries(state.geometries, preset),
      preset,
    }));
  },

  importConfig: (geometries: GeometryItem[], preset: PresetId) => {
    set({ geometries, selectedId: null, preset });
  },
}));
