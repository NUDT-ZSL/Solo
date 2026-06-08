import { create } from 'zustand';
import type { FlavorProfile } from '@/types';

interface AppState {
  profiles: FlavorProfile[];
  searchQuery: string;
  selectedTag: string;
  selectedMood: string;
  setSearchQuery: (q: string) => void;
  setSelectedTag: (t: string) => void;
  setSelectedMood: (m: string) => void;
  setProfiles: (p: FlavorProfile[]) => void;
  updateProfile: (id: string, updates: Partial<FlavorProfile>) => void;
  addProfile: (p: FlavorProfile) => void;
  addComment: (profileId: string, comment: FlavorProfile['comments'][0]) => void;
}

export const useStore = create<AppState>((set) => ({
  profiles: [],
  searchQuery: '',
  selectedTag: '',
  selectedMood: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedTag: (t) => set({ selectedTag: t }),
  setSelectedMood: (m) => set({ selectedMood: m }),
  setProfiles: (p) => set({ profiles: p }),
  updateProfile: (id, updates) =>
    set((state) => ({
      profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  addProfile: (p) => set((state) => ({ profiles: [p, ...state.profiles] })),
  addComment: (profileId, comment) =>
    set((state) => ({
      profiles: state.profiles.map((p) =>
        p.id === profileId ? { ...p, comments: [...p.comments, comment] } : p
      ),
    })),
}));
