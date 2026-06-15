import { create } from 'zustand';
import {
  fetchCapsules,
  fetchCapsuleById,
  createCapsule,
  deleteCapsule,
  inviteFriend,
  generateShareLink,
  type CapsuleResponse,
  type CreateCapsuleRequest,
} from '@/utils/api';

interface CapsuleState {
  capsules: CapsuleResponse[];
  current: CapsuleResponse | null;
  loading: boolean;
  fetchAll: () => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  create: (data: CreateCapsuleRequest) => Promise<void>;
  remove: (id: string) => Promise<void>;
  inviteFriend: (capsuleId: string, email: string) => Promise<void>;
  share: (capsuleId: string) => Promise<string | undefined>;
}

export const useCapsuleStore = create<CapsuleState>((set) => ({
  capsules: [],
  current: null,
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    try {
      const capsules = await fetchCapsules();
      set({ capsules });
    } finally {
      set({ loading: false });
    }
  },

  fetchOne: async (id: string) => {
    set({ loading: true });
    try {
      const current = await fetchCapsuleById(id);
      set({ current });
    } finally {
      set({ loading: false });
    }
  },

  create: async (data: CreateCapsuleRequest) => {
    set({ loading: true });
    try {
      const response = await createCapsule(data);
      set((state) => ({ capsules: [...state.capsules, response] }));
    } finally {
      set({ loading: false });
    }
  },

  remove: async (id: string) => {
    await deleteCapsule(id);
    set((state) => ({
      capsules: state.capsules.filter((c) => c.capsule.id !== id),
      current: state.current?.capsule.id === id ? null : state.current,
    }));
  },

  inviteFriend: async (capsuleId: string, email: string) => {
    const friend = await inviteFriend(capsuleId, email);
    set((state) => {
      if (state.current?.capsule.id === capsuleId) {
        return {
          current: {
            ...state.current,
            capsule: {
              ...state.current.capsule,
              invitedFriends: [...state.current.capsule.invitedFriends, friend],
            },
          },
        };
      }
      return {};
    });
  },

  share: async (capsuleId: string) => {
    const { shareId } = await generateShareLink(capsuleId);
    set((state) => {
      if (state.current?.capsule.id === capsuleId) {
        return {
          current: {
            ...state.current,
            capsule: { ...state.current.capsule, shareId },
          },
        };
      }
      return {};
    });
    return shareId;
  },
}));
