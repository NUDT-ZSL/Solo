import { create } from 'zustand';
import type { Photo, PhotoState, PhotoActions } from '@/types';
import * as dataStore from '@/utils/dataStore';
import { generateMockPhotos } from '@/utils/mockData';

const initialState: PhotoState = {
  photos: [],
  selectedTags: [],
  selectedPhotoIds: [],
  referencePhotoId: null,
  isModalOpen: false,
  currentPhotoId: null,
  isDragging: false,
  searchQuery: '',
};

export const usePhotoStore = create<PhotoState & PhotoActions>((set, get) => ({
  ...initialState,

  loadPhotos: () => {
    let photos = dataStore.loadPhotos();
    if (photos.length === 0) {
      photos = generateMockPhotos(50);
      dataStore.savePhotos(photos);
    }
    set({ photos });
  },

  addPhoto: (photo: Photo) => {
    const photos = [...get().photos, photo];
    dataStore.addPhoto(photo);
    set({ photos });
  },

  updatePhoto: (id: string, updates: Partial<Photo>) => {
    const photos = get().photos.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    dataStore.updatePhoto(id, updates);
    set({ photos });
  },

  deletePhoto: (id: string) => {
    const photos = get().photos.filter(p => p.id !== id);
    dataStore.deletePhoto(id);
    set({ photos });
  },

  toggleTag: (tag: string) => {
    const selectedTags = get().selectedTags;
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    set({ selectedTags: newSelectedTags, referencePhotoId: null });
  },

  clearSelectedTags: () => {
    set({ selectedTags: [], referencePhotoId: null });
  },

  togglePhotoSelection: (id: string, multiSelect = false) => {
    const selectedPhotoIds = get().selectedPhotoIds;
    let newSelectedIds: string[];

    if (multiSelect) {
      newSelectedIds = selectedPhotoIds.includes(id)
        ? selectedPhotoIds.filter(pid => pid !== id)
        : [...selectedPhotoIds, id];
    } else {
      newSelectedIds = selectedPhotoIds.includes(id) ? [] : [id];
    }

    set({ selectedPhotoIds: newSelectedIds });
  },

  clearPhotoSelection: () => {
    set({ selectedPhotoIds: [] });
  },

  setReferencePhoto: (id: string | null) => {
    set({ referencePhotoId: id, selectedTags: [] });
  },

  openModal: (id: string) => {
    set({ isModalOpen: true, currentPhotoId: id });
  },

  closeModal: () => {
    set({ isModalOpen: false, currentPhotoId: null });
  },

  setDragging: (isDragging: boolean) => {
    set({ isDragging });
  },

  addTagToPhoto: (photoId: string, tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || trimmedTag.length > 8) return;

    const photos = get().photos.map(p => {
      if (p.id === photoId && !p.tags.includes(trimmedTag) && p.tags.length < 10) {
        return { ...p, tags: [...p.tags, trimmedTag] };
      }
      return p;
    });

    dataStore.addTagToPhoto(photoId, trimmedTag);
    set({ photos });
  },

  removeTagFromPhoto: (photoId: string, tag: string) => {
    const photos = get().photos.map(p => {
      if (p.id === photoId) {
        return { ...p, tags: p.tags.filter(t => t !== tag) };
      }
      return p;
    });

    dataStore.removeTagFromPhoto(photoId, tag);
    set({ photos });
  },

  batchAddTags: (photoIds: string[], tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || trimmedTag.length > 8) return;

    const photos = get().photos.map(p => {
      if (photoIds.includes(p.id) && !p.tags.includes(trimmedTag) && p.tags.length < 10) {
        return { ...p, tags: [...p.tags, trimmedTag] };
      }
      return p;
    });

    dataStore.batchAddTags(photoIds, trimmedTag);
    set({ photos, selectedPhotoIds: [] });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },
}));
