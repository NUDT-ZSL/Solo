import { create } from "zustand";
import type { ScentBottle, UserStats } from "./types";
import { api } from "./api";

function getOrCreateUserId(): string {
  let id = localStorage.getItem("scent_drift_user_id");
  if (!id) {
    id = "user_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("scent_drift_user_id", id);
  }
  return id;
}

interface AppState {
  userId: string;
  randomBottles: ScentBottle[];
  hotBottles: ScentBottle[];
  userBottles: ScentBottle[];
  resonatedBottles: ScentBottle[];
  userStats: UserStats | null;
  loading: boolean;
  createModalOpen: boolean;
  resonateModalBottle: ScentBottle | null;

  fetchRandomBottles: () => Promise<void>;
  fetchHotBottles: () => Promise<void>;
  fetchUserData: () => Promise<void>;
  createBottle: (data: { emoji: string; description: string; scent_type: string }) => Promise<void>;
  resonateBottle: (bottleId: string, data: { emoji: string; description: string }) => Promise<void>;
  driftBottle: (bottleId: string) => Promise<void>;
  setCreateModalOpen: (open: boolean) => void;
  setResonateModalBottle: (bottle: ScentBottle | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  userId: getOrCreateUserId(),
  randomBottles: [],
  hotBottles: [],
  userBottles: [],
  resonatedBottles: [],
  userStats: null,
  loading: false,
  createModalOpen: false,
  resonateModalBottle: null,

  fetchRandomBottles: async () => {
    set({ loading: true });
    try {
      const bottles = await api.getRandomBottles(get().userId);
      set({ randomBottles: bottles });
    } finally {
      set({ loading: false });
    }
  },

  fetchHotBottles: async () => {
    try {
      const bottles = await api.getHotBottles();
      set({ hotBottles: bottles });
    } catch {}
  },

  fetchUserData: async () => {
    const uid = get().userId;
    try {
      const [pub, res, stats] = await Promise.all([
        api.getUserBottles(uid),
        api.getUserResonated(uid),
        api.getUserStats(uid),
      ]);
      set({ userBottles: pub, resonatedBottles: res, userStats: stats });
    } catch {}
  },

  createBottle: async (data) => {
    const bottle = await api.createBottle({ ...data, author_id: get().userId });
    set((s) => ({ randomBottles: [bottle, ...s.randomBottles], createModalOpen: false }));
    get().fetchUserData();
  },

  resonateBottle: async (bottleId, data) => {
    await api.resonateBottle(bottleId, { ...data, author_id: get().userId });
    set((s) => ({
      randomBottles: s.randomBottles.filter((b) => b.id !== bottleId),
      resonateModalBottle: null,
    }));
    get().fetchHotBottles();
    get().fetchUserData();
  },

  driftBottle: async (bottleId) => {
    await api.driftBottle(bottleId, get().userId);
    set((s) => ({
      randomBottles: s.randomBottles.filter((b) => b.id !== bottleId),
    }));
    get().fetchRandomBottles();
  },

  setCreateModalOpen: (open) => set({ createModalOpen: open }),
  setResonateModalBottle: (bottle) => set({ resonateModalBottle: bottle }),
}));
