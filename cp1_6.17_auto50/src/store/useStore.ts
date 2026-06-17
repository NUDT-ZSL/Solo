import { create } from 'zustand';
import type {
  Artwork,
  Commission,
  CommissionStatus,
  Message,
  Notification
} from '../data/mockData';
import { mockArtworks } from '../data/mockData';

interface AppState {
  artworks: Artwork[];
  commissions: Commission[];
  messages: Message[];
  notifications: Notification[];
  selectedCommissionId: string | null;
  currentView: 'portfolio' | 'board' | 'detail';
  activeFilter: string | null;

  initArtworks: (artworks: Artwork[]) => void;
  addCommission: (data: Omit<Commission, 'id' | 'status' | 'progress' | 'createdAt'>) => void;
  updateCommissionStatus: (id: string, status: CommissionStatus) => void;
  setSelectedCommission: (id: string | null) => void;
  setCurrentView: (view: 'portfolio' | 'board' | 'detail') => void;

  toggleFilter: (style: string) => void;
  clearFilter: () => void;
  getFilteredArtworks: () => Artwork[];

  addMessage: (commissionId: string, sender: 'client' | 'designer', content: string) => void;
  getMessagesByCommission: (commissionId: string) => Message[];

  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  markAllNotificationsRead: () => void;
  getUnreadCount: () => number;
}

export const useStore = create<AppState>((set, get) => ({
  artworks: [],
  commissions: [],
  messages: [],
  notifications: [],
  selectedCommissionId: null,
  currentView: 'portfolio',
  activeFilter: null,

  initArtworks: (artworks) => set({ artworks }),

  toggleFilter: (style) =>
    set((state) => ({
      activeFilter: state.activeFilter === style ? null : style
    })),

  clearFilter: () => set({ activeFilter: null }),

  getFilteredArtworks: () => {
    const { artworks, activeFilter } = get();
    if (!activeFilter) return artworks;
    return artworks.filter((a) => a.styles.includes(activeFilter));
  },

  addCommission: (data) => {
    const newCommission: Commission = {
      ...data,
      id: 'c' + Date.now(),
      status: 'pending',
      progress: 10,
      createdAt: new Date().toISOString()
    };
    set((state) => ({ commissions: [...state.commissions, newCommission] }));
    get().addNotification({
      title: '新委托已创建',
      content: `「${data.artworkTitle}」委托已提交，等待设计师接洽`,
      type: 'status'
    });
  },

  updateCommissionStatus: (id, status) => {
    const commission = get().commissions.find((c) => c.id === id);
    const progressMap: Record<CommissionStatus, number> = {
      pending: 10,
      negotiating: 25,
      creating: 55,
      revising: 80,
      completed: 100
    };
    set((state) => ({
      commissions: state.commissions.map((c) =>
        c.id === id
          ? { ...c, status, progress: progressMap[status] }
          : c
      )
    }));
    if (commission) {
      const statusText: Record<CommissionStatus, string> = {
        pending: '待接洽',
        negotiating: '协商中',
        creating: '创作中',
        revising: '修改中',
        completed: '已完成'
      };
      get().addNotification({
        title: '委托状态更新',
        content: `「${commission.artworkTitle}」已更新为：${statusText[status]}`,
        type: 'status'
      });
    }
  },

  setSelectedCommission: (id) => set({ selectedCommissionId: id }),
  setCurrentView: (view) => set({ currentView: view }),

  addMessage: (commissionId, sender, content) => {
    const newMessage: Message = {
      id: 'm' + Date.now(),
      commissionId,
      sender,
      content,
      timestamp: new Date().toISOString()
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));
    if (sender === 'designer') {
      const commission = get().commissions.find((c) => c.id === commissionId);
      if (commission) {
        get().addNotification({
          title: '设计师回复',
          content: `「${commission.artworkTitle}」有新的设计师回复`,
          type: 'message'
        });
      }
    }
  },

  getMessagesByCommission: (commissionId) =>
    get().messages.filter((m) => m.commissionId === commissionId),

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: 'n' + Date.now(),
      read: false,
      createdAt: new Date().toISOString()
    };
    set((state) => ({ notifications: [newNotification, ...state.notifications] }));
  },

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    })),

  deleteNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    })),

  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    })),

  getUnreadCount: () => get().notifications.filter((n) => !n.read).length
}));

export { mockArtworks };
