import { create } from 'zustand';
import type { EmotionRecord, Echo, StatsData } from '../../shared/types';
import { DEFAULT_USER_ID } from '../../shared/types';

interface EmotionState {
  records: EmotionRecord[];
  echoes: Echo[];
  stats: StatsData | null;
  loading: boolean;
  selectedRecord: EmotionRecord | null;
  modalOpen: boolean;
  editingRecord: EmotionRecord | null;
  shareModalOpen: boolean;
  toastMessage: string;
  toastVisible: boolean;

  fetchTrajectories: () => Promise<void>;
  createRecord: (record: Omit<EmotionRecord, 'id' | 'userId'>) => Promise<void>;
  updateRecord: (id: string, record: Partial<EmotionRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  addEcho: (echo: Omit<Echo, 'id' | 'createdAt'>) => Promise<void>;
  fetchStats: () => Promise<void>;
  setSelectedRecord: (record: EmotionRecord | null) => void;
  setModalOpen: (open: boolean) => void;
  setEditingRecord: (record: EmotionRecord | null) => void;
  setShareModalOpen: (open: boolean) => void;
  showToast: (message: string) => void;
}

export const useEmotionStore = create<EmotionState>((set, get) => ({
  records: [],
  echoes: [],
  stats: null,
  loading: false,
  selectedRecord: null,
  modalOpen: false,
  editingRecord: null,
  shareModalOpen: false,
  toastMessage: '',
  toastVisible: false,

  fetchTrajectories: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/trajectories?userId=${DEFAULT_USER_ID}`);
      const data = await res.json();
      set({ records: data.records, echoes: data.echoes, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createRecord: async (record) => {
    try {
      const res = await fetch('/api/trajectories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, userId: DEFAULT_USER_ID }),
      });
      const newRecord = await res.json();
      set((state) => {
        const exists = state.records.findIndex((r) => r.date === newRecord.date);
        if (exists >= 0) {
          const updated = [...state.records];
          updated[exists] = newRecord;
          return { records: updated };
        }
        return { records: [...state.records, newRecord].sort((a, b) => a.date.localeCompare(b.date)) };
      });
    } catch {}
  },

  updateRecord: async (id, record) => {
    try {
      const res = await fetch(`/api/trajectories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, userId: DEFAULT_USER_ID }),
      });
      const updated = await res.json();
      set((state) => ({
        records: state.records.map((r) => (r.id === id ? updated : r)),
      }));
    } catch {}
  },

  deleteRecord: async (id) => {
    try {
      await fetch(`/api/trajectories/${id}?userId=${DEFAULT_USER_ID}`, { method: 'DELETE' });
      set((state) => ({
        records: state.records.filter((r) => r.id !== id),
        selectedRecord: null,
      }));
    } catch {}
  },

  addEcho: async (echo) => {
    try {
      await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(echo),
      });
      await get().fetchTrajectories();
    } catch {}
  },

  fetchStats: async () => {
    try {
      const res = await fetch(`/api/stats?userId=${DEFAULT_USER_ID}`);
      const data = await res.json();
      set({ stats: data });
    } catch {}
  },

  setSelectedRecord: (record) => set({ selectedRecord: record }),
  setModalOpen: (open) => set({ modalOpen: open }),
  setEditingRecord: (record) => set({ editingRecord: record }),
  setShareModalOpen: (open) => set({ shareModalOpen: open }),

  showToast: (message) => {
    set({ toastMessage: message, toastVisible: true });
    setTimeout(() => set({ toastVisible: false }), 2000);
  },
}));
