import { create } from 'zustand';
import { Totem } from '@/types';

interface AppState {
  totems: Totem[];
  myTotems: Totem[];
  userId: string;
  selectedTotemId: string | null;
  hoveredTotemId: string | null;
  isRecording: boolean;
  isRecordPanelOpen: boolean;
  playingTotemId: string | null;

  setTotems: (totems: Totem[]) => void;
  addTotem: (totem: Totem) => void;
  removeTotem: (id: string) => void;
  mergeTotem: (merged: Totem) => void;
  incrementPlayCount: (id: string) => void;
  setSelectedTotemId: (id: string | null) => void;
  setHoveredTotemId: (id: string | null) => void;
  setIsRecording: (v: boolean) => void;
  setIsRecordPanelOpen: (v: boolean) => void;
  setPlayingTotemId: (id: string | null) => void;
  fetchTotems: () => Promise<void>;
  fetchMyTotems: () => Promise<void>;
  createTotem: (audioData: string) => Promise<Totem>;
  deleteTotem: (id: string) => Promise<void>;
  mergeTotems: (sourceId: string, targetId: string) => Promise<Totem>;
}

const getUserId = (): string => {
  let id = localStorage.getItem('echo_puzzle_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('echo_puzzle_user_id', id);
  }
  return id;
};

export const useStore = create<AppState>((set, get) => ({
  totems: [],
  myTotems: [],
  userId: getUserId(),
  selectedTotemId: null,
  hoveredTotemId: null,
  isRecording: false,
  isRecordPanelOpen: false,
  playingTotemId: null,

  setTotems: (totems) => set({ totems }),
  addTotem: (totem) => set((s) => ({ totems: [...s.totems, totem] })),
  removeTotem: (id) => set((s) => ({ totems: s.totems.filter((t) => t.id !== id) })),
  mergeTotem: (merged) =>
    set((s) => ({
      totems: [...s.totems.filter((t) => t.id !== merged.id), merged],
    })),
  incrementPlayCount: (id) =>
    set((s) => ({
      totems: s.totems.map((t) => (t.id === id ? { ...t, playCount: t.playCount + 1 } : t)),
    })),
  setSelectedTotemId: (id) => set({ selectedTotemId: id }),
  setHoveredTotemId: (id) => set({ hoveredTotemId: id }),
  setIsRecording: (v) => set({ isRecording: v }),
  setIsRecordPanelOpen: (v) => set({ isRecordPanelOpen: v }),
  setPlayingTotemId: (id) => set({ playingTotemId: id }),

  fetchTotems: async () => {
    try {
      const res = await fetch('/api/totems');
      const data = await res.json();
      set({ totems: data });
    } catch (err) {
      console.error('Failed to fetch totems:', err);
    }
  },

  fetchMyTotems: async () => {
    try {
      const { userId } = get();
      const res = await fetch(`/api/totems/user/${userId}`);
      const data = await res.json();
      set({ myTotems: data });
    } catch (err) {
      console.error('Failed to fetch my totems:', err);
    }
  },

  createTotem: async (audioData: string) => {
    const { userId } = get();
    const res = await fetch('/api/totems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioData, ownerId: userId }),
    });
    const totem: Totem = await res.json();
    set((s) => ({ totems: [...s.totems, totem] }));
    return totem;
  },

  deleteTotem: async (id: string) => {
    const { userId } = get();
    await fetch(`/api/totems/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId: userId }),
    });
    set((s) => ({
      totems: s.totems.filter((t) => t.id !== id),
      myTotems: s.myTotems.filter((t) => t.id !== id),
    }));
  },

  mergeTotems: async (sourceId: string, targetId: string) => {
    const res = await fetch('/api/totems/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, targetId }),
    });
    const merged: Totem = await res.json();
    set((s) => ({
      totems: s.totems
        .filter((t) => t.id !== sourceId && t.id !== targetId)
        .concat(merged),
    }));
    return merged;
  },
}));
