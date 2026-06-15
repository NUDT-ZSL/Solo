import { create } from 'zustand';

export interface Voxel {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  createdAt: number;
}

interface VoxelStore {
  voxels: Voxel[];
  currentColor: string;
  isDay: boolean;
  isClearing: boolean;
  addVoxel: (x: number, y: number, z: number) => void;
  removeVoxel: (id: string) => void;
  clearVoxels: () => void;
  setColor: (color: string) => void;
  toggleDayNight: () => void;
  finishClearing: () => void;
}

export const PRESET_COLORS = [
  '#ff4444',
  '#ff8844',
  '#ffcc44',
  '#44ff44',
  '#4488ff',
  '#aa44ff',
  '#ff44aa',
  '#ffffff',
];

export const DEFAULT_COLOR = '#cccccc';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useVoxelStore = create<VoxelStore>((set) => ({
  voxels: [],
  currentColor: DEFAULT_COLOR,
  isDay: true,
  isClearing: false,

  addVoxel: (x, y, z) =>
    set((state) => {
      const exists = state.voxels.some(
        (v) => v.x === x && v.y === y && v.z === z
      );
      if (exists || state.voxels.length >= 500) return state;
      return {
        voxels: [
          ...state.voxels,
          {
            id: generateId(),
            x,
            y,
            z,
            color: state.currentColor,
            createdAt: Date.now(),
          },
        ],
      };
    }),

  removeVoxel: (id) =>
    set((state) => ({
      voxels: state.voxels.filter((v) => v.id !== id),
    })),

  clearVoxels: () =>
    set(() => ({
      isClearing: true,
    })),

  finishClearing: () =>
    set(() => ({
      voxels: [],
      isClearing: false,
    })),

  setColor: (color) =>
    set(() => ({
      currentColor: color,
    })),

  toggleDayNight: () =>
    set((state) => ({
      isDay: !state.isDay,
    })),
}));
