import { create } from 'zustand';
import type { Fragment, GalleryItem, StyleType } from '@/types';

interface StoreState {
  sourceImage: HTMLImageElement | null;
  sourceImageUrl: string;
  fragments: Fragment[];
  selectedIds: string[];
  currentStyle: StyleType;
  styleTransitioning: boolean;
  renderProgress: number;
  gallery: GalleryItem[];
  propertyPanelOpen: boolean;

  setSourceImage: (img: HTMLImageElement | null, url: string) => void;
  setFragments: (fragments: Fragment[]) => void;
  updateFragment: (id: string, updates: Partial<Fragment>) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelected: (id: string, multi?: boolean) => void;
  setCurrentStyle: (style: StyleType) => void;
  setStyleTransitioning: (v: boolean) => void;
  setRenderProgress: (v: number) => void;
  setPropertyPanelOpen: (v: boolean) => void;
  addGalleryItem: (item: GalleryItem) => void;
  removeGalleryItem: (id: string) => void;
  setGallery: (items: GalleryItem[]) => void;
  resetWorkspace: () => void;
}

export const useStore = create<StoreState>((set) => ({
  sourceImage: null,
  sourceImageUrl: '',
  fragments: [],
  selectedIds: [],
  currentStyle: 'collage',
  styleTransitioning: false,
  renderProgress: 0,
  gallery: [],
  propertyPanelOpen: false,

  setSourceImage: (img, url) => set({ sourceImage: img, sourceImageUrl: url }),
  setFragments: (fragments) => set({ fragments }),
  updateFragment: (id, updates) =>
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),
  setSelectedIds: (ids) =>
    set({ selectedIds: ids, propertyPanelOpen: ids.length > 0 }),
  toggleSelected: (id, multi = false) =>
    set((state) => {
      let newSelected: string[];
      if (multi) {
        newSelected = state.selectedIds.includes(id)
          ? state.selectedIds.filter((x) => x !== id)
          : [...state.selectedIds, id];
      } else {
        newSelected = [id];
      }
      return {
        selectedIds: newSelected,
        propertyPanelOpen: newSelected.length > 0,
      };
    }),
  setCurrentStyle: (style) => set({ currentStyle: style }),
  setStyleTransitioning: (v) => set({ styleTransitioning: v }),
  setRenderProgress: (v) => set({ renderProgress: v }),
  setPropertyPanelOpen: (v) => set({ propertyPanelOpen: v }),
  addGalleryItem: (item) =>
    set((state) => ({ gallery: [item, ...state.gallery] })),
  removeGalleryItem: (id) =>
    set((state) => ({
      gallery: state.gallery.filter((g) => g.id !== id),
    })),
  setGallery: (items) => set({ gallery: items }),
  resetWorkspace: () =>
    set({
      sourceImage: null,
      sourceImageUrl: '',
      fragments: [],
      selectedIds: [],
      propertyPanelOpen: false,
    }),
}));
