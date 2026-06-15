import { create } from 'zustand';
import * as api from '@/api/client';

export interface Bottle {
  id: string;
  description: string;
  emoji: string;
  category: string;
  creator_id: string;
  resonance_count: number;
  created_at: string;
}

export interface Resonance {
  id: string;
  bottle_id: string;
  description: string;
  emoji: string;
  user_id: string;
  created_at: string;
}

export interface UserStats {
  total_published: number;
  total_resonated: number;
  category_distribution: Record<string, number>;
}

interface StoreState {
  userId: string;
  nickname: string;
  driftBottles: Bottle[];
  hotBottles: Bottle[];
  currentBottle: Bottle | null;
  showCreateModal: boolean;
  showResonateModal: boolean;
  showResonancesModal: boolean;
}

interface StoreActions {
  setUserId: (id: string) => void;
  setNickname: (name: string) => void;
  setDriftBottles: (bottles: Bottle[]) => void;
  setHotBottles: (bottles: Bottle[]) => void;
  setCurrentBottle: (bottle: Bottle | null) => void;
  toggleCreateModal: () => void;
  toggleResonateModal: () => void;
  toggleResonancesModal: () => void;
  loadDriftBottles: () => Promise<void>;
  loadHotBottles: () => Promise<void>;
  loadUser: () => Promise<void>;
}

const getStoredUserId = (): string => {
  try {
    return localStorage.getItem('scent_user_id') || 'default-user';
  } catch {
    return 'default-user';
  }
};

const getStoredNickname = (): string => {
  try {
    return localStorage.getItem('sent_nickname') || '';
  } catch {
    return '';
  }
};

export const useStore = create<StoreState & StoreActions>((set, get) => ({
  userId: getStoredUserId(),
  nickname: getStoredNickname(),
  driftBottles: [],
  hotBottles: [],
  currentBottle: null,
  showCreateModal: false,
  showResonateModal: false,
  showResonancesModal: false,

  setUserId: (id) => {
    localStorage.setItem('scent_user_id', id);
    set({ userId: id });
  },
  setNickname: (name) => {
    localStorage.setItem('sent_nickname', name);
    set({ nickname: name });
  },
  setDriftBottles: (bottles) => set({ driftBottles: bottles }),
  setHotBottles: (bottles) => set({ hotBottles: bottles }),
  setCurrentBottle: (bottle) => set({ currentBottle: bottle }),
  toggleCreateModal: () => set((s) => ({ showCreateModal: !s.showCreateModal })),
  toggleResonateModal: () => set((s) => ({ showResonateModal: !s.showResonateModal })),
  toggleResonancesModal: () => set((s) => ({ showResonancesModal: !s.showResonancesModal })),

  loadDriftBottles: async () => {
    try {
      const bottles = await api.fetchDriftBottles(get().userId);
      set({ driftBottles: bottles });
    } catch (e) {
      console.error('Failed to load drift bottles:', e);
    }
  },

  loadHotBottles: async () => {
    try {
      const bottles = await api.fetchHotBottles();
      set({ hotBottles: bottles });
    } catch (e) {
      console.error('Failed to load hot bottles:', e);
    }
  },

  loadUser: async () => {
    try {
      const user = await api.createUser(get().nickname || '漂泊者');
      get().setUserId(user.id);
      if (user.nickname) get().setNickname(user.nickname);
    } catch (e) {
      console.error('Failed to load user:', e);
    }
  },
}));
