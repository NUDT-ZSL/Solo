import { create } from 'zustand';
import type {
  Tag,
  ToastMessage,
  UploadedImage,
  VeinData,
  ViewMode,
  PendingTag,
  ImageDetail,
} from '@/types';

interface AppState {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;

  currentImage: UploadedImage | null;
  currentVeinData: VeinData | null;
  setCurrentImage: (img: UploadedImage | null, vein: VeinData | null) => void;

  tags: Tag[];
  addTag: (t: Tag) => void;
  setTags: (tags: Tag[]) => void;
  removeTag: (id: string) => void;

  images: UploadedImage[];
  setImages: (imgs: UploadedImage[]) => void;

  highlightTagId: string | null;
  setHighlightTagId: (id: string | null) => void;

  pendingTag: PendingTag | null;
  setPendingTag: (p: PendingTag | null) => void;

  showVeinFlash: boolean;
  triggerVeinFlash: () => void;

  justSavedTagId: string | null;
  setJustSavedTagId: (id: string | null) => void;

  galleryDetail: ImageDetail | null;
  setGalleryDetail: (d: ImageDetail | null) => void;

  searchKeyword: string;
  setSearchKeyword: (k: string) => void;

  toasts: ToastMessage[];
  addToast: (t: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

let toastCounter = 0;

export const useAppStore = create<AppState>((set, get) => ({
  viewMode: 'canvas',
  setViewMode: (m) => set({ viewMode: m }),

  sidebarOpen: true,
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  currentImage: null,
  currentVeinData: null,
  setCurrentImage: (img, vein) =>
    set({ currentImage: img, currentVeinData: vein, tags: [] }),

  tags: [],
  addTag: (t) => set({ tags: [t, ...get().tags] }),
  setTags: (tags) => set({ tags }),
  removeTag: (id) => set({ tags: get().tags.filter((t) => t.id !== id) }),

  images: [],
  setImages: (imgs) => set({ images: imgs }),

  highlightTagId: null,
  setHighlightTagId: (id) => set({ highlightTagId: id }),

  pendingTag: null,
  setPendingTag: (p) => set({ pendingTag: p }),

  showVeinFlash: false,
  triggerVeinFlash: () => {
    set({ showVeinFlash: true });
    setTimeout(() => set({ showVeinFlash: false }), 300);
  },

  justSavedTagId: null,
  setJustSavedTagId: (id) => {
    set({ justSavedTagId: id });
    if (id) setTimeout(() => set({ justSavedTagId: null }), 500);
  },

  galleryDetail: null,
  setGalleryDetail: (d) => set({ galleryDetail: d }),

  searchKeyword: '',
  setSearchKeyword: (k) => set({ searchKeyword: k }),

  toasts: [],
  addToast: (t) => {
    const id = `toast_${++toastCounter}_${Date.now()}`;
    const duration = t.duration ?? 2000;
    set({ toasts: [...get().toasts, { ...t, id }] });
    setTimeout(() => get().removeToast(id), duration);
  },
  removeToast: (id) =>
    set({ toasts: get().toasts.filter((x) => x.id !== id) }),

  isProcessing: false,
  setIsProcessing: (v) => set({ isProcessing: v }),
}));
