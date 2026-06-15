import { create } from 'zustand';
import { Dream, MOCK_DREAMS } from '@/data/mockData';

interface DreamState {
  dreams: Dream[];
  searchQuery: string;
  addDream: (dream: Omit<Dream, 'id' | 'createdAt'>) => void;
  setSearchQuery: (query: string) => void;
  getFilteredDreams: () => Dream[];
  getDreamById: (id: string) => Dream | undefined;
}

export const useDreamStore = create<DreamState>((set, get) => ({
  dreams: MOCK_DREAMS,
  searchQuery: '',
  addDream: (dream) => {
    const newDream: Dream = {
      ...dream,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    set((state) => ({ dreams: [newDream, ...state.dreams] }));
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  getFilteredDreams: () => {
    const { dreams, searchQuery } = get();
    if (!searchQuery.trim()) return dreams;
    const q = searchQuery.toLowerCase();
    return dreams.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.foodKeywords.some((k) => k.toLowerCase().includes(q)) ||
        d.emotion.toLowerCase().includes(q)
    );
  },
  getDreamById: (id) => {
    return get().dreams.find((d) => d.id === id);
  },
}));
