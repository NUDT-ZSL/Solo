import { create } from 'zustand';
import axios from 'axios';

export interface Room {
  id: string;
  roomCode: string;
  theme: string;
  creatorName: string;
  createdAt: string;
  memberCount: number;
  paragraphCount: number;
}

export interface StoryParagraph {
  id: string;
  roomId: string;
  content: string;
  author: string;
  order: number;
  createdAt: string;
}

export interface Member {
  id: string;
  roomId: string;
  userName: string;
  joinedAt: string;
}

export interface RoomStats {
  totalParagraphs: number;
  totalWords: number;
  memberCount: number;
  contributions: { author: string; count: number }[];
}

export interface AISuggestion {
  suggestions: string[];
}

interface AppState {
  userName: string;
  currentRoom: Room | null;
  rooms: Room[];
  paragraphs: StoryParagraph[];
  members: Member[];
  stats: RoomStats | null;
  setUserName: (name: string) => void;
  setCurrentRoom: (room: Room | null) => void;
  fetchRooms: () => Promise<void>;
  createRoom: (theme: string, creatorName: string) => Promise<Room>;
  joinRoom: (roomCode: string, userName: string) => Promise<Room>;
  fetchParagraphs: (roomId: string) => Promise<void>;
  submitParagraph: (roomId: string, content: string, author: string) => Promise<void>;
  fetchStats: (roomCode: string) => Promise<void>;
  fetchMembers: (roomCode: string) => Promise<void>;
  getSuggestions: (content: string) => Promise<string[]>;
}

export const useStore = create<AppState>((set, get) => ({
  userName: '',
  currentRoom: null,
  rooms: [],
  paragraphs: [],
  members: [],
  stats: null,

  setUserName: (name) => set({ userName: name }),
  setCurrentRoom: (room) => set({ currentRoom: room }),

  fetchRooms: async () => {
    const res = await axios.get<Room[]>('/api/rooms');
    set({ rooms: res.data });
  },

  createRoom: async (theme, creatorName) => {
    const res = await axios.post<Room>('/api/rooms', { theme, creatorName });
    set((state) => ({ rooms: [res.data, ...state.rooms] }));
    return res.data;
  },

  joinRoom: async (roomCode, userName) => {
    const res = await axios.post<Room>(`/api/rooms/${roomCode}/join`, { userName });
    return res.data;
  },

  fetchParagraphs: async (roomId) => {
    const res = await axios.get<StoryParagraph[]>(`/api/stories/${roomId}`);
    set({ paragraphs: res.data });
  },

  submitParagraph: async (roomId, content, author) => {
    const res = await axios.post<StoryParagraph>(`/api/stories/${roomId}`, { content, author });
    set((state) => ({ paragraphs: [...state.paragraphs, res.data] }));
  },

  fetchStats: async (roomCode) => {
    const res = await axios.get<RoomStats>(`/api/rooms/${roomCode}/stats`);
    set({ stats: res.data });
  },

  fetchMembers: async (roomCode) => {
    const res = await axios.get<Member[]>(`/api/rooms/${roomCode}/members`);
    set({ members: res.data });
  },

  getSuggestions: async (content) => {
    const res = await axios.post<AISuggestion>('/api/ai/suggest', { content });
    return res.data.suggestions;
  },
}));
