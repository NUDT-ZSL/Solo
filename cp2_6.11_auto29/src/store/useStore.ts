import { create } from 'zustand';
import { Story, Reply, UserStats, CalendarData } from '../types';
import { api } from '../utils/api';

interface AppState {
  stories: Story[];
  replies: Record<string, Reply[]>;
  hasMore: boolean;
  currentPage: number;
  userStats: UserStats | null;
  calendarData: CalendarData | null;
  loading: boolean;

  loadStories: (page?: number) => Promise<void>;
  addStory: (s: Story) => void;
  loadReplies: (storyId: string) => Promise<void>;
  addReply: (r: Reply) => void;
  loadUserStats: () => Promise<void>;
  loadCalendarData: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  stories: [],
  replies: {},
  hasMore: true,
  currentPage: 0,
  userStats: null,
  calendarData: null,
  loading: false,

  loadStories: async (page) => {
    const next = page ?? get().currentPage + 1;
    if (get().loading) return;
    if (!get().hasMore && !page) return;
    set({ loading: true });
    try {
      const res = await api.getStories(next, 20);
      set(s => ({
        stories: page === 1 ? res.data : [...s.stories, ...res.data],
        hasMore: res.hasMore,
        currentPage: res.page,
        loading: false
      }));
    } catch { set({ loading: false }); }
  },

  addStory: (s) => set(st => ({ stories: [s, ...st.stories] })),

  loadReplies: async (storyId) => {
    try {
      const data = await api.getReplies(storyId);
      set(st => ({ replies: { ...st.replies, [storyId]: data } }));
    } catch {}
  },

  addReply: (r) => set(st => {
    const arr = st.replies[r.storyId] || [];
    const stories = st.stories.map(s =>
      s.id === r.storyId ? { ...s, replyCount: s.replyCount + 1 } : s
    );
    return {
      replies: { ...st.replies, [r.storyId]: [...arr, r] },
      stories
    };
  }),

  loadUserStats: async () => {
    try { set({ userStats: await api.getUserStats() }); } catch {}
  },

  loadCalendarData: async () => {
    try { set({ calendarData: await api.getCalendarData(4) }); } catch {}
  }
}));
