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
  addStory: (story: Story) => void;
  loadReplies: (storyId: string) => Promise<void>;
  addReply: (reply: Reply) => void;
  loadUserStats: () => Promise<void>;
  loadCalendarData: () => Promise<void>;
  resetStories: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  stories: [],
  replies: {},
  hasMore: true,
  currentPage: 0,
  userStats: null,
  calendarData: null,
  loading: false,

  loadStories: async (page?: number) => {
    const nextPage = page ?? get().currentPage + 1;
    if (get().loading) return;
    if (!get().hasMore && !page) return;

    set({ loading: true });
    try {
      const res = await api.getStories(nextPage, 20);
      set(state => ({
        stories: page === 1 ? res.data : [...state.stories, ...res.data],
        hasMore: res.hasMore,
        currentPage: res.page,
        loading: false
      }));
    } catch (e) {
      set({ loading: false });
    }
  },

  addStory: (story: Story) => {
    set(state => ({
      stories: [story, ...state.stories]
    }));
  },

  loadReplies: async (storyId: string) => {
    try {
      const data = await api.getReplies(storyId);
      set(state => ({
        replies: { ...state.replies, [storyId]: data }
      }));
    } catch (e) {
      console.error(e);
    }
  },

  addReply: (reply: Reply) => {
    set(state => {
      const storyReplies = state.replies[reply.storyId] || [];
      const stories = state.stories.map(s =>
        s.id === reply.storyId ? { ...s, replyCount: s.replyCount + 1 } : s
      );
      return {
        replies: { ...state.replies, [reply.storyId]: [...storyReplies, reply] },
        stories
      };
    });
  },

  loadUserStats: async () => {
    try {
      const data = await api.getUserStats();
      set({ userStats: data });
    } catch (e) {
      console.error(e);
    }
  },

  loadCalendarData: async () => {
    try {
      const data = await api.getCalendarData(4);
      set({ calendarData: data });
    } catch (e) {
      console.error(e);
    }
  },

  resetStories: () => {
    set({ stories: [], currentPage: 0, hasMore: true });
  }
}));
