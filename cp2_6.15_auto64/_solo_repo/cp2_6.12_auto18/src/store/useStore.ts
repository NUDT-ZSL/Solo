import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import axios, { AxiosInstance } from 'axios';

interface Poll {
  id: string;
  title: string;
  description: string;
  options: string[];
  votes: number[];
  createdBy: string;
  createdAt: number;
  duration: number;
  closed: boolean;
}

interface Comment {
  id: string;
  pollId: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: number;
}

interface AppState {
  polls: Poll[];
  currentPoll: Poll | null;
  comments: Comment[];
  userId: string;
  nickname: string;
  favorites: string[];
  socket: Socket | null;
  pulsePollId: string | null;
  isLoggedIn: boolean;
  token: string;
  showLoginModal: boolean;

  setNickname: (nickname: string) => void;
  initSocket: () => void;
  fetchPolls: () => Promise<void>;
  fetchPoll: (id: string) => Promise<void>;
  createPoll: (data: { title: string; description: string; options: string[]; duration: number }) => Promise<void>;
  vote: (pollId: string, optionIndex: number) => void;
  closePoll: (pollId: string) => Promise<void>;
  fetchComments: (pollId: string) => Promise<void>;
  fetchCommentsPage: (pollId: string, offset: number, limit: number) => Promise<{ comments: Comment[]; hasMore: boolean; total: number }>;
  sendComment: (pollId: string, content: string) => void;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (pollId: string) => Promise<void>;
  login: (username: string) => void;
  logout: () => void;
  setShowLoginModal: (show: boolean) => void;
}

const getUserId = (): string => {
  let id = localStorage.getItem('userId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('userId', id);
  }
  return id;
};

const getStoredNickname = (): string => {
  return localStorage.getItem('nickname') || '';
};

const getStoredToken = (): string => {
  return localStorage.getItem('token') || '';
};

const getStoredIsLoggedIn = (): boolean => {
  return !!localStorage.getItem('token');
};

let api: AxiosInstance | null = null;

const getApi = (): AxiosInstance => {
  if (!api) {
    api = axios.create();
    api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }
  return api;
};

export const useStore = create<AppState>((set, get) => ({
  polls: [],
  currentPoll: null,
  comments: [],
  userId: getUserId(),
  nickname: getStoredNickname(),
  favorites: [],
  socket: null,
  pulsePollId: null,
  isLoggedIn: getStoredIsLoggedIn(),
  token: getStoredToken(),
  showLoginModal: false,

  setNickname: (nickname: string) => {
    localStorage.setItem('nickname', nickname);
    set({ nickname });
  },

  setShowLoginModal: (show: boolean) => {
    set({ showLoginModal: show });
  },

  login: (username: string) => {
    const token = btoa(username + ':' + Date.now() + ':' + Math.random().toString(36).slice(2, 10));
    localStorage.setItem('token', token);
    localStorage.setItem('nickname', username);
    set({ isLoggedIn: true, token, nickname: username });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nickname');
    set({ isLoggedIn: false, token: '', nickname: '', favorites: [] });
  },

  initSocket: () => {
    const existing = get().socket;
    if (existing) return;

    const socket = io();

    socket.on('pollCreated', (newPoll: Poll) => {
      set((state) => ({
        polls: [newPoll, ...state.polls],
      }));
    });

    socket.on('pollUpdated', (updatedPoll: Poll) => {
      set((state) => ({
        polls: state.polls.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)),
        currentPoll:
          state.currentPoll?.id === updatedPoll.id ? updatedPoll : state.currentPoll,
      }));
    });

    socket.on('newComment', (comment: Comment) => {
      set((state) => {
        if (state.currentPoll && state.currentPoll.id === comment.pollId) {
          return { comments: [...state.comments, comment] };
        }
        return state;
      });
    });

    socket.on('pollClosed', ({ pollId }: { pollId: string }) => {
      set((state) => ({
        pulsePollId: pollId,
        polls: state.polls.map((p) => (p.id === pollId ? { ...p, closed: true } : p)),
        currentPoll:
          state.currentPoll?.id === pollId
            ? { ...state.currentPoll, closed: true }
            : state.currentPoll,
      }));
      setTimeout(() => {
        set({ pulsePollId: null });
      }, 2000);
    });

    socket.on('favoriteUpdated', (data: { userId: string; pollId: string; action: 'add' | 'remove' }) => {
      const { userId } = get();
      if (data.userId !== userId) return;

      set((state) => {
        if (data.action === 'add') {
          if (state.favorites.includes(data.pollId)) return state;
          return { favorites: [...state.favorites, data.pollId] };
        } else {
          return { favorites: state.favorites.filter((id) => id !== data.pollId) };
        }
      });
    });

    set({ socket });
  },

  fetchPolls: async () => {
    try {
      const res = await getApi().get<Poll[]>('/api/polls');
      set({ polls: res.data });
    } catch {
      console.error('Failed to fetch polls');
    }
  },

  fetchPoll: async (id: string) => {
    try {
      const res = await getApi().get<Poll>(`/api/polls/${id}`);
      set({ currentPoll: res.data });
    } catch {
      console.error('Failed to fetch poll');
    }
  },

  createPoll: async (data) => {
    try {
      const { userId, nickname } = get();
      const res = await getApi().post<Poll>('/api/polls', { ...data, createdBy: userId, nickname });
      set((state) => ({
        polls: [res.data, ...state.polls],
      }));
    } catch {
      console.error('Failed to create poll');
    }
  },

  vote: (pollId, optionIndex) => {
    const { socket, userId } = get();
    if (socket) {
      socket.emit('vote', { pollId, optionIndex, userId });
    }
  },

  closePoll: async (pollId: string) => {
    try {
      await getApi().post(`/api/polls/${pollId}/close`);
    } catch {
      console.error('Failed to close poll');
    }
  },

  fetchComments: async (pollId: string) => {
    try {
      const res = await getApi().get<Comment[]>(`/api/polls/${pollId}/comments`);
      set({ comments: res.data });
    } catch {
      console.error('Failed to fetch comments');
    }
  },

  fetchCommentsPage: async (pollId: string, offset: number, limit: number) => {
    const res = await getApi().get<{ comments: Comment[]; hasMore: boolean; total: number }>(
      `/api/polls/${pollId}/comments?offset=${offset}&limit=${limit}`
    );
    return res.data;
  },

  sendComment: (pollId: string, content: string) => {
    const { socket, userId, nickname } = get();
    if (socket) {
      socket.emit('comment', { pollId, userId, nickname, content });
    }
  },

  fetchFavorites: async () => {
    try {
      const { userId } = get();
      const res = await getApi().get<Poll[]>(`/api/favorites/${userId}`);
      set({ favorites: res.data.map((p: Poll) => p.id) });
    } catch {
      console.error('Failed to fetch favorites');
    }
  },

  toggleFavorite: async (pollId: string) => {
    try {
      const { userId, favorites, isLoggedIn } = get();

      if (!isLoggedIn) {
        get().setShowLoginModal(true);
        return;
      }

      const isFavorited = favorites.includes(pollId);
      if (isFavorited) {
        await getApi().delete('/api/favorites', { data: { userId, pollId } });
      } else {
        await getApi().post('/api/favorites', { userId, pollId });
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  },
}));
