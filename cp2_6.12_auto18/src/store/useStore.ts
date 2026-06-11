import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

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

  setNickname: (nickname: string) => void;
  initSocket: () => void;
  fetchPolls: () => Promise<void>;
  fetchPoll: (id: string) => Promise<void>;
  createPoll: (data: { title: string; description: string; options: string[]; duration: number }) => Promise<void>;
  vote: (pollId: string, optionIndex: number) => void;
  closePoll: (pollId: string) => Promise<void>;
  fetchComments: (pollId: string) => Promise<void>;
  sendComment: (pollId: string, content: string) => void;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (pollId: string) => Promise<void>;
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

export const useStore = create<AppState>((set, get) => ({
  polls: [],
  currentPoll: null,
  comments: [],
  userId: getUserId(),
  nickname: getStoredNickname(),
  favorites: [],
  socket: null,
  pulsePollId: null,

  setNickname: (nickname: string) => {
    localStorage.setItem('nickname', nickname);
    set({ nickname });
  },

  initSocket: () => {
    const existing = get().socket;
    if (existing) return;

    const socket = io();

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

    set({ socket });
  },

  fetchPolls: async () => {
    try {
      const res = await axios.get<Poll[]>('/api/polls');
      set({ polls: res.data });
    } catch {
      console.error('Failed to fetch polls');
    }
  },

  fetchPoll: async (id: string) => {
    try {
      const res = await axios.get<Poll>(`/api/polls/${id}`);
      set({ currentPoll: res.data });
    } catch {
      console.error('Failed to fetch poll');
    }
  },

  createPoll: async (data) => {
    try {
      const { userId, nickname } = get();
      await axios.post('/api/polls', { ...data, createdBy: userId, nickname });
      await get().fetchPolls();
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
      await axios.patch(`/api/polls/${pollId}/close`);
    } catch {
      console.error('Failed to close poll');
    }
  },

  fetchComments: async (pollId: string) => {
    try {
      const res = await axios.get<Comment[]>(`/api/polls/${pollId}/comments`);
      set({ comments: res.data });
    } catch {
      console.error('Failed to fetch comments');
    }
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
      const res = await axios.get<string[]>(`/api/favorites/${userId}`);
      set({ favorites: res.data });
    } catch {
      console.error('Failed to fetch favorites');
    }
  },

  toggleFavorite: async (pollId: string) => {
    try {
      const { userId, favorites } = get();
      await axios.post('/api/favorites', { userId, pollId });
      set({
        favorites: favorites.includes(pollId)
          ? favorites.filter((id) => id !== pollId)
          : [...favorites, pollId],
      });
    } catch {
      console.error('Failed to toggle favorite');
    }
  },
}));
