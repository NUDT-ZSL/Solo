import { create } from 'zustand';
import { apiClient } from '@/api';
import type { Material, Board } from '@shared/types';

interface StoreState {
  materials: Material[];
  boards: Board[];
  selectedMaterials: string[];
  loading: boolean;
  page: number;
  hasMore: boolean;
  keyword: string;
  selectedTag: string | null;

  setMaterials: (materials: Material[]) => void;
  addMaterial: (material: Material) => void;
  updateMaterial: (id: string, data: Partial<Material>) => void;
  removeMaterial: (id: string) => void;

  setBoards: (boards: Board[]) => void;
  addBoard: (board: Board) => void;
  updateBoard: (id: string, data: Partial<Board>) => void;
  removeBoard: (id: string) => void;

  setSelectedMaterials: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  setLoading: (loading: boolean) => void;
  setPage: (page: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setKeyword: (keyword: string) => void;
  setSelectedTag: (tag: string | null) => void;

  loadMoreMaterials: (reset?: boolean) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  materials: [],
  boards: [],
  selectedMaterials: [],
  loading: false,
  page: 1,
  hasMore: true,
  keyword: '',
  selectedTag: null,

  setMaterials: (materials) => set({ materials }),
  addMaterial: (material) =>
    set((state) => ({ materials: [material, ...state.materials] })),
  updateMaterial: (id, data) =>
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, ...data } : m
      ),
    })),
  removeMaterial: (id) =>
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    })),

  setBoards: (boards) => set({ boards }),
  addBoard: (board) => set((state) => ({ boards: [...state.boards, board] })),
  updateBoard: (id, data) =>
    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === id ? { ...b, ...data } : b
      ),
    })),
  removeBoard: (id) =>
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== id),
    })),

  setSelectedMaterials: (ids) => set({ selectedMaterials: ids }),
  toggleSelect: (id) =>
    set((state) => ({
      selectedMaterials: state.selectedMaterials.includes(id)
        ? state.selectedMaterials.filter((i) => i !== id)
        : [...state.selectedMaterials, id],
    })),
  clearSelection: () => set({ selectedMaterials: [] }),

  setLoading: (loading) => set({ loading }),
  setPage: (page) => set({ page }),
  setHasMore: (hasMore) => set({ hasMore }),
  setKeyword: (keyword) => set({ keyword }),
  setSelectedTag: (selectedTag) => set({ selectedTag }),

  loadMoreMaterials: async (reset = false) => {
    const { loading, page, keyword, selectedTag } = get();
    if (loading) return;

    const currentPage = reset ? 1 : page;

    set({ loading: true });

    try {
      const response = await apiClient.getMaterials({
        page: currentPage,
        pageSize: 20,
        keyword: keyword || undefined,
        tag: selectedTag || undefined,
      });

      set((state) => ({
        materials: reset
          ? response.materials
          : [...state.materials, ...response.materials],
        hasMore: response.hasMore,
        page: currentPage + 1,
        loading: false,
      }));
    } catch (error) {
      set({ loading: false });
    }
  },
}));
