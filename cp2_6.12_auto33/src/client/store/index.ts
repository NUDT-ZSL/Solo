import { create } from 'zustand';
import {
  getExchangeRequests,
  getUser,
  markRequestRead,
  markAllRequestsRead,
} from '../api';
import type { User, ExchangeRequest } from '../types';

export type { User, ExchangeRequest };

interface AppState {
  currentUser: User | null;
  unreadCount: number;
  searchKeyword: string;
  selectedCategory: string;
  showPublishModal: boolean;
  exchangeRequests: ExchangeRequest[];
  loading: boolean;
  initError: string | null;

  initApp: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  incrementUnread: () => void;
  decrementUnread: () => void;
  setSearch: (keyword: string) => void;
  setSelectedCategory: (category: string) => void;
  setShowPublishModal: (show: boolean) => void;
  markRequestAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

function mergeAndSortRequests(
  received: ExchangeRequest[],
  sent: ExchangeRequest[],
): ExchangeRequest[] {
  return [...received, ...sent].sort((a, b) => b.createdAt - a.createdAt);
}

function calculateUnreadCount(received: ExchangeRequest[]): number {
  return received.reduce((count, req) => (req.read === 0 ? count + 1 : count), 0);
}

const CURRENT_USER_ID = 'user_2';

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  unreadCount: 0,
  searchKeyword: '',
  selectedCategory: 'all',
  showPublishModal: false,
  exchangeRequests: [],
  loading: false,
  initError: null,

  initApp: async () => {
    set({ loading: true, initError: null });
    try {
      const [user, requestsResponse] = await Promise.all([
        getUser(CURRENT_USER_ID),
        getExchangeRequests(CURRENT_USER_ID),
      ]);
      const merged = mergeAndSortRequests(
        requestsResponse.received,
        requestsResponse.sent,
      );
      const unread = calculateUnreadCount(requestsResponse.received);
      set({
        currentUser: user,
        exchangeRequests: merged,
        unreadCount: unread,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '初始化失败';
      set({ initError: message, loading: false });
    }
  },

  refreshRequests: async () => {
    try {
      const requestsResponse = await getExchangeRequests(CURRENT_USER_ID);
      const merged = mergeAndSortRequests(
        requestsResponse.received,
        requestsResponse.sent,
      );
      const unread = calculateUnreadCount(requestsResponse.received);
      set({
        exchangeRequests: merged,
        unreadCount: unread,
      });
    } catch (error) {
      console.error('刷新请求失败:', error);
    }
  },

  incrementUnread: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),

  decrementUnread: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

  setSearch: (keyword) => set({ searchKeyword: keyword }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  setShowPublishModal: (show) => set({ showPublishModal: show }),

  markRequestAsRead: async (id: string) => {
    const state = get();
    const target = state.exchangeRequests.find((r) => r.id === id);
    if (!target || target.read === 1) return;

    try {
      await markRequestRead(id);
      set((prev) => ({
        exchangeRequests: prev.exchangeRequests.map((req) =>
          req.id === id ? { ...req, read: 1 as const } : req,
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  },

  markAllAsRead: async () => {
    const state = get();
    if (!state.currentUser) return;
    if (state.unreadCount === 0) return;

    try {
      await markAllRequestsRead(state.currentUser.id);
      set((prev) => ({
        exchangeRequests: prev.exchangeRequests.map((req) => ({
          ...req,
          read: 1 as const,
        })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('全部已读失败:', error);
    }
  },
}));
