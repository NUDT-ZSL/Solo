import { create } from 'zustand';
import { CollageElement, UploadedImage } from './types';

interface CanvasStore {
  elements: CollageElement[];
  zoom: number;
  panX: number;
  panY: number;
  selectedId: string | null;
  bgColor: string;
  uploadedImages: UploadedImage[];
  newlyAddedId: string | null;

  addElement: (element: CollageElement) => void;
  updateElement: (id: string, updates: Partial<CollageElement>) => void;
  removeElement: (id: string) => void;
  bringToFront: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  clearAll: () => void;
  addUploadedImage: (image: UploadedImage) => void;
  clearNewlyAdded: () => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  elements: [],
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedId: null,
  bgColor: '#FAFAFA',
  uploadedImages: [],
  newlyAddedId: null,

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
      newlyAddedId: element.id,
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates } as CollageElement) : el
      ),
    })),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  bringToFront: (id) =>
    set((state) => {
      const idx = state.elements.findIndex((el) => el.id === id);
      if (idx === -1 || idx === state.elements.length - 1) return state;
      const newElements = [...state.elements];
      const [element] = newElements.splice(idx, 1);
      element.zIndex = state.elements.length;
      newElements.push(element);
      return { elements: newElements };
    }),

  setSelectedId: (id) => set({ selectedId: id }),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  clearAll: () => set({ elements: [], selectedId: null, newlyAddedId: null }),

  addUploadedImage: (image) =>
    set((state) => ({
      uploadedImages: [...state.uploadedImages, image],
    })),

  clearNewlyAdded: () => set({ newlyAddedId: null }),
}));
