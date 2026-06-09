import { create } from 'zustand';
import type { Sculpture, CameraState, FeaturedSnapshot } from '@/types';

interface GalleryStore {
  sculptures: Sculpture[];
  featuredSnapshots: FeaturedSnapshot[];
  selectedSculptureId: string | null;
  isAutoTouring: boolean;
  shareDialogOpen: boolean;
  cameraState: CameraState;
  toast: { message: string; visible: boolean } | null;
  loadingSculptures: boolean;
  loadingFeatured: boolean;

  setSculptures: (sculptures: Sculpture[]) => void;
  setFeaturedSnapshots: (snapshots: FeaturedSnapshot[]) => void;
  selectSculpture: (id: string | null) => void;
  setAutoTouring: (on: boolean) => void;
  setShareDialogOpen: (open: boolean) => void;
  setCameraState: (state: Partial<CameraState>) => void;
  showToast: (message: string, duration?: number) => void;
  hideToast: () => void;
  setLoadingSculptures: (v: boolean) => void;
  setLoadingFeatured: (v: boolean) => void;
}

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  sculptures: [],
  featuredSnapshots: [],
  selectedSculptureId: null,
  isAutoTouring: false,
  shareDialogOpen: false,
  cameraState: {
    position: { x: 7.5, y: 2.5, z: 7.5 },
    target: { x: 0, y: 1, z: 0 },
    zoom: 5
  },
  toast: null,
  loadingSculptures: false,
  loadingFeatured: false,

  setSculptures: (sculptures) => set({ sculptures }),
  setFeaturedSnapshots: (featuredSnapshots) => set({ featuredSnapshots }),
  selectSculpture: (id) => set({ selectedSculptureId: id, isAutoTouring: id ? false : get().isAutoTouring }),
  setAutoTouring: (on) => set({ isAutoTouring: on }),
  setShareDialogOpen: (open) => set({ shareDialogOpen: open }),
  setCameraState: (state) =>
    set((prev) => ({ cameraState: { ...prev.cameraState, ...state } })),
  showToast: (message, duration = 2000) => {
    set({ toast: { message, visible: true } });
    setTimeout(() => {
      get().hideToast();
    }, duration);
  },
  hideToast: () => set({ toast: null }),
  setLoadingSculptures: (v) => set({ loadingSculptures: v }),
  setLoadingFeatured: (v) => set({ loadingFeatured: v })
}));
