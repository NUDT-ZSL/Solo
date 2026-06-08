import { create } from 'zustand';
import type { TeaRecord, Comment } from '@/types';

interface TeaState {
  records: TeaRecord[];
  comments: Comment[];
  currentRecord: TeaRecord | null;
  filterVariety: string;
  filterMood: string[];
  fetchRecords: () => Promise<void>;
  fetchRecord: (id: string) => Promise<void>;
  createRecord: (formData: Partial<TeaRecord>) => Promise<void>;
  updateRecord: (id: string, formData: Partial<TeaRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  fetchComments: (recordId: string) => Promise<void>;
  addComment: (recordId: string, data: { author: string; content: string }) => Promise<void>;
  setFilterVariety: (v: string) => void;
  setFilterMood: (moods: string[]) => void;
  filteredRecords: () => TeaRecord[];
}

const API = '/api';

export const useTeaStore = create<TeaState>((set, get) => ({
  records: [],
  comments: [],
  currentRecord: null,
  filterVariety: '',
  filterMood: [],

  fetchRecords: async () => {
    try {
      const res = await fetch(`${API}/records`);
      const data = await res.json();
      set({ records: data });
    } catch {
      set({ records: [] });
    }
  },

  fetchRecord: async (id: string) => {
    try {
      const res = await fetch(`${API}/records/${id}`);
      const data = await res.json();
      set({ currentRecord: data });
    } catch {
      set({ currentRecord: null });
    }
  },

  createRecord: async (formData: Partial<TeaRecord>) => {
    try {
      const res = await fetch(`${API}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      set((state) => ({ records: [...state.records, data] }));
    } catch {}
  },

  updateRecord: async (id: string, formData: Partial<TeaRecord>) => {
    try {
      const res = await fetch(`${API}/records/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, updatedAt: new Date().toISOString() }),
      });
      const data = await res.json();
      set((state) => ({
        records: state.records.map((r) => (r.id === id ? data : r)),
        currentRecord: data,
      }));
    } catch {}
  },

  deleteRecord: async (id: string) => {
    try {
      await fetch(`${API}/records/${id}`, { method: 'DELETE' });
      set((state) => ({
        records: state.records.filter((r) => r.id !== id),
        currentRecord: state.currentRecord?.id === id ? null : state.currentRecord,
      }));
    } catch {}
  },

  fetchComments: async (recordId: string) => {
    try {
      const res = await fetch(`${API}/records/${recordId}/comments`);
      const data = await res.json();
      set({ comments: data });
    } catch {
      set({ comments: [] });
    }
  },

  addComment: async (recordId: string, data: { author: string; content: string }) => {
    try {
      const res = await fetch(`${API}/records/${recordId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const comment = await res.json();
      set((state) => ({ comments: [...state.comments, comment] }));
    } catch {}
  },

  setFilterVariety: (v: string) => set({ filterVariety: v }),
  setFilterMood: (moods: string[]) => set({ filterMood: moods }),

  filteredRecords: () => {
    const { records, filterVariety, filterMood } = get();
    return records.filter((r) => {
      const matchVariety = !filterVariety || r.variety === filterVariety;
      const matchMood = filterMood.length === 0 || filterMood.some((m) => r.mood.includes(m));
      return matchVariety && matchMood;
    });
  },
}));
