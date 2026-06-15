import { create } from 'zustand';
import { fetchGallery, fetchImageDetail, uploadImage, addComment } from '@/lib/api';
import type { GalleryItem, ImageDetail, UploadResult } from '@/lib/api';

interface GalleryState {
  items: GalleryItem[];
  total: number;
  page: number;
  loading: boolean;
  detail: ImageDetail | null;
  detailLoading: boolean;
  uploading: boolean;
  uploadResult: UploadResult | null;

  loadGallery: (page?: number, pageSize?: number) => Promise<void>;
  loadMore: (pageSize?: number) => Promise<void>;
  loadDetail: (imageId: string) => Promise<void>;
  upload: (file: File, description?: string) => Promise<UploadResult | null>;
  submitComment: (imageId: string, content: string) => Promise<void>;
  clearUploadResult: () => void;
  clearDetail: () => void;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  loading: false,
  detail: null,
  detailLoading: false,
  uploading: false,
  uploadResult: null,

  loadGallery: async (page = 1, pageSize = 20) => {
    set({ loading: true });
    try {
      const data = await fetchGallery(page, pageSize);
      set({ items: data.items, total: data.total, page: data.page, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMore: async (pageSize = 20) => {
    const { page, items } = get();
    const nextPage = page + 1;
    set({ loading: true });
    try {
      const data = await fetchGallery(nextPage, pageSize);
      set({
        items: [...items, ...data.items],
        total: data.total,
        page: nextPage,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  loadDetail: async (imageId: string) => {
    set({ detailLoading: true, detail: null });
    try {
      const data = await fetchImageDetail(imageId);
      set({ detail: data, detailLoading: false });
    } catch {
      set({ detailLoading: false });
    }
  },

  upload: async (file: File, description?: string) => {
    set({ uploading: true, uploadResult: null });
    try {
      const result = await uploadImage(file, description);
      set({ uploading: false, uploadResult: result });
      get().loadGallery(1);
      return result;
    } catch {
      set({ uploading: false });
      return null;
    }
  },

  submitComment: async (imageId: string, content: string) => {
    const comment = await addComment(imageId, content);
    const detail = get().detail;
    if (detail) {
      set({
        detail: {
          ...detail,
          comments: [...detail.comments, comment],
        },
      });
    }
  },

  clearUploadResult: () => set({ uploadResult: null }),
  clearDetail: () => set({ detail: null }),
}));
