import { create } from 'zustand';
import type { CodeSnippet, HeatmapData } from '../types';
import {
  fetchSnippets as apiFetchSnippets,
  fetchTags as apiFetchTags,
  fetchSnippetById as apiFetchSnippetById,
  fetchHeatmap as apiFetchHeatmap,
  likeSnippet as apiLikeSnippet,
} from '../utils/http';

interface StoreState {
  snippets: CodeSnippet[];
  selectedTags: string[];
  allTags: string[];
  currentSnippet: CodeSnippet | null;
  loading: boolean;
  heatmapData: HeatmapData[];
  showUploadModal: boolean;
  fetchSnippets: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchSnippetById: (id: string) => Promise<void>;
  fetchHeatmap: () => Promise<void>;
  toggleTag: (tag: string) => void;
  setCurrentSnippet: (snippet: CodeSnippet | null) => void;
  setShowUploadModal: (show: boolean) => void;
  likeSnippetById: (id: string) => Promise<void>;
}

const useStore = create<StoreState>()((set, get) => ({
  snippets: [],
  selectedTags: [],
  allTags: [],
  currentSnippet: null,
  loading: false,
  heatmapData: [],
  showUploadModal: false,

  fetchSnippets: async () => {
    set({ loading: true });
    try {
      const res = await apiFetchSnippets({ tags: get().selectedTags });
      set({ snippets: res.data.items });
    } catch (error) {
      console.error('Failed to fetch snippets:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchTags: async () => {
    try {
      const res = await apiFetchTags();
      set({ allTags: res.data });
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  },

  fetchSnippetById: async (id: string) => {
    set({ loading: true });
    try {
      const res = await apiFetchSnippetById(id);
      set({ currentSnippet: res.data });
    } catch (error) {
      console.error('Failed to fetch snippet by id:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchHeatmap: async () => {
    try {
      const res = await apiFetchHeatmap();
      set({ heatmapData: res.data });
    } catch (error) {
      console.error('Failed to fetch heatmap:', error);
    }
  },

  toggleTag: (tag: string) => {
    const { selectedTags } = get();
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    set({ selectedTags: next });
    get().fetchSnippets();
  },

  setCurrentSnippet: (snippet) => set({ currentSnippet: snippet }),
  setShowUploadModal: (show) => set({ showUploadModal: show }),

  likeSnippetById: async (id: string) => {
    try {
      const res = await apiLikeSnippet(id);
      set({ currentSnippet: res.data });
    } catch (error) {
      console.error('Failed to like snippet:', error);
    }
  },
}));

export default useStore;
