import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  ComponentData,
  ComponentType,
  getDefaultProps,
  THEME_PRESETS,
  MAX_COMPONENTS,
} from './types';

interface AppState {
  components: ComponentData[];
  selectedId: string | null;
  canvasBg: string;
  showExport: boolean;
  deletingIds: Set<string>;

  addComponent: (type: ComponentType, x: number, y: number) => void;
  updateComponentProps: (id: string, props: Partial<Record<string, any>>) => void;
  updateComponentPosition: (id: string, x: number, y: number) => void;
  updateComponentZIndex: (id: string, zIndex: number) => void;
  selectComponent: (id: string | null) => void;
  deleteComponent: (id: string) => void;
  setCanvasBg: (color: string) => void;
  setShowExport: (show: boolean) => void;
  setDeleting: (id: string, deleting: boolean) => void;
  bringToFront: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  components: [],
  selectedId: null,
  canvasBg: THEME_PRESETS[0].value,
  showExport: false,
  deletingIds: new Set(),

  addComponent: (type, x, y) => {
    const { components } = get();
    if (components.length >= MAX_COMPONENTS) return;
    const maxZ = components.reduce((max, c) => Math.max(max, c.zIndex), 0);
    const newComp: ComponentData = {
      id: uuidv4(),
      type,
      x,
      y,
      zIndex: maxZ + 1,
      props: getDefaultProps(type),
    };
    set({ components: [...components, newComp], selectedId: newComp.id });
  },

  updateComponentProps: (id, props) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, props: { ...c.props, ...props } } : c
      ),
    }));
  },

  updateComponentPosition: (id, x, y) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, x, y } : c
      ),
    }));
  },

  updateComponentZIndex: (id, zIndex) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, zIndex } : c
      ),
    }));
  },

  selectComponent: (id) => {
    set({ selectedId: id });
  },

  deleteComponent: (id) => {
    const { deletingIds } = get();
    const newSet = new Set(deletingIds);
    newSet.add(id);
    set({ deletingIds: newSet, selectedId: null });
    setTimeout(() => {
      set((state) => ({
        components: state.components.filter((c) => c.id !== id),
        deletingIds: new Set([...state.deletingIds].filter((d) => d !== id)),
      }));
    }, 250);
  },

  setCanvasBg: (color) => {
    set({ canvasBg: color });
  },

  setShowExport: (show) => {
    set({ showExport: show });
  },

  setDeleting: (id, deleting) => {
    set((state) => {
      const newSet = new Set(state.deletingIds);
      if (deleting) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return { deletingIds: newSet };
    });
  },

  bringToFront: (id) => {
    set((state) => {
      const maxZ = state.components.reduce((max, c) => Math.max(max, c.zIndex), 0);
      return {
        components: state.components.map((c) =>
          c.id === id ? { ...c, zIndex: maxZ + 1 } : c
        ),
      };
    });
  },
}));
