import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
}

export interface ExchangeRequest {
  id: string;
  requesterName: string;
  requesterAvatar: string;
  furnitureName: string;
  furnitureImage: string;
  time: string;
  read: boolean;
}

interface AppState {
  currentUser: User;
  unreadCount: number;
  searchKeyword: string;
  selectedCategory: string;
  showPublishModal: boolean;
  exchangeRequests: ExchangeRequest[];

  incrementUnread: () => void;
  decrementUnread: () => void;
  setSearch: (keyword: string) => void;
  setSelectedCategory: (category: string) => void;
  setShowPublishModal: (show: boolean) => void;
  markRequestAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';

export const useAppStore = create<AppState>((set) => ({
  currentUser: {
    id: 'user_2',
    name: '小王',
    avatar: DEFAULT_AVATAR,
    phone: '138****8888',
    email: 'xiaowang@example.com',
  },
  unreadCount: 3,
  searchKeyword: '',
  selectedCategory: 'all',
  showPublishModal: false,
  exchangeRequests: [
    {
      id: 'req_1',
      requesterName: '李明',
      requesterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liming',
      furnitureName: '北欧风实木餐桌',
      furnitureImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&h=100&fit=crop',
      time: '5分钟前',
      read: false,
    },
    {
      id: 'req_2',
      requesterName: '张丽',
      requesterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangli',
      furnitureName: '三人位布艺沙发',
      furnitureImage: 'https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?w=100&h=100&fit=crop',
      time: '30分钟前',
      read: false,
    },
    {
      id: 'req_3',
      requesterName: '王芳',
      requesterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang',
      furnitureName: '铁艺书架',
      furnitureImage: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=100&h=100&fit=crop',
      time: '2小时前',
      read: false,
    },
    {
      id: 'req_4',
      requesterName: '刘强',
      requesterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liuqiang',
      furnitureName: '复古实木床头柜',
      furnitureImage: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=100&h=100&fit=crop',
      time: '1天前',
      read: true,
    },
  ],

  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  setSearch: (keyword) => set({ searchKeyword: keyword }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setShowPublishModal: (show) => set({ showPublishModal: show }),
  markRequestAsRead: (id) =>
    set((state) => ({
      exchangeRequests: state.exchangeRequests.map((req) =>
        req.id === id ? { ...req, read: true } : req
      ),
      unreadCount: state.exchangeRequests.find((r) => r.id === id && !r.read)
        ? state.unreadCount - 1
        : state.unreadCount,
    })),
  markAllAsRead: () =>
    set((state) => ({
      exchangeRequests: state.exchangeRequests.map((req) => ({ ...req, read: true })),
      unreadCount: 0,
    })),
}));
