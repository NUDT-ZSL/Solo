import { create } from 'zustand';

export type Emotion = 'happy' | 'sad' | 'calm' | 'angry';

export interface Message {
  id: string;
  audio_url: string;
  duration: number;
  emotion: Emotion;
  emotion_label: string;
  created_at: string;
  resonance_count: number;
  parent_id: string | null;
  volume_data: number[];
}

export interface EmotionStats {
  happy: number;
  sad: number;
  calm: number;
  angry: number;
  daily_counts: { date: string; count: number }[];
}

interface MessageStore {
  messages: Message[];
  stats: EmotionStats | null;
  selectedMessage: Message | null;
  isRecordModalOpen: boolean;
  isDetailCardOpen: boolean;
  loading: boolean;

  fetchMessages: () => Promise<void>;
  fetchStats: () => Promise<void>;
  uploadMessage: (formData: FormData) => Promise<Message>;
  resonateMessage: (id: string, formData: FormData) => Promise<Message>;
  selectMessage: (message: Message | null) => void;
  setRecordModalOpen: (open: boolean) => void;
  setDetailCardOpen: (open: boolean) => void;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messages: [],
  stats: null,
  selectedMessage: null,
  isRecordModalOpen: false,
  isDetailCardOpen: false,
  loading: false,

  fetchMessages: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      set({ messages: data });
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    const res = await fetch('/api/stats');
    const data = await res.json();
    set({ stats: data });
  },

  uploadMessage: async (formData) => {
    const res = await fetch('/api/messages/upload', {
      method: 'POST',
      body: formData,
    });
    const message = await res.json();
    set((state) => ({ messages: [message, ...state.messages] }));
    return message;
  },

  resonateMessage: async (id, formData) => {
    const res = await fetch(`/api/messages/${id}/resonate`, {
      method: 'POST',
      body: formData,
    });
    const message = await res.json();
    set((state) => ({
      messages: [message, ...state.messages].map((m) =>
        m.id === id ? { ...m, resonance_count: m.resonance_count + 1 } : m
      ),
    }));
    return message;
  },

  selectMessage: (message) => {
    set({ selectedMessage: message, isDetailCardOpen: message !== null });
  },

  setRecordModalOpen: (open) => {
    set({ isRecordModalOpen: open });
  },

  setDetailCardOpen: (open) => {
    set({ isDetailCardOpen: open });
  },
}));
