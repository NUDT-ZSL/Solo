import { create } from 'zustand';
import { Poem, EchoComment, User, Emotion, analyzeEmotion, computeIllustrationParams, generateId } from '../PoemEngine';
import * as api from '../api';

interface PoemStore {
  currentUser: User | null;
  poems: Poem[];
  echoes: Record<string, EchoComment[]>;
  isLoading: boolean;
  filterMine: boolean;

  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setFilterMine: (v: boolean) => void;

  addPoem: (title: string, content: string, emotion: Emotion) => Promise<void>;
  removePoem: (id: string) => Promise<void>;
  loadEchoes: (poemId: string) => Promise<void>;
  addEcho: (poemId: string, content: string, emoji: string) => Promise<void>;
  getFilteredPoems: () => Poem[];
  getEchoes: (poemId: string) => EchoComment[];
}

export const useStore = create<PoemStore>((set, get) => ({
  currentUser: null,
  poems: [],
  echoes: {},
  isLoading: false,
  filterMine: false,

  init: async () => {
    const user = api.getCurrentUser();
    const poems = await api.fetchPoems();
    set({ currentUser: user, poems });
  },

  login: async (username, password) => {
    const user = await api.loginUser(username, password);
    set({ currentUser: user });
  },

  register: async (username, password) => {
    const user = await api.registerUser(username, password);
    await api.loginUser(username, password);
    set({ currentUser: user });
  },

  logout: () => {
    api.logoutUser();
    set({ currentUser: null, filterMine: false });
  },

  setFilterMine: (v) => set({ filterMine: v }),

  addPoem: async (title, content, emotion) => {
    const user = get().currentUser;
    if (!user) return;
    const detectedEmotion = emotion === 'calm' && content.length > 0
      ? analyzeEmotion(content)
      : emotion;
    const illustration = computeIllustrationParams(detectedEmotion, content);
    const poem = await api.createPoem({
      title,
      content,
      emotion: detectedEmotion,
      author: user.username,
      authorId: user.id,
      illustration,
    });
    set((s) => ({ poems: [poem, ...s.poems] }));
  },

  removePoem: async (id) => {
    await api.deletePoem(id);
    set((s) => ({ poems: s.poems.filter((p) => p.id !== id) }));
  },

  loadEchoes: async (poemId) => {
    const list = await api.fetchEchoes(poemId);
    set((s) => ({ echoes: { ...s.echoes, [poemId]: list } }));
  },

  addEcho: async (poemId, content, emoji) => {
    const user = get().currentUser;
    if (!user) return;
    const echo = await api.createEcho(poemId, {
      content,
      emoji,
      author: user.username,
      authorId: user.id,
    });
    set((s) => ({
      echoes: {
        ...s.echoes,
        [poemId]: [...(s.echoes[poemId] || []), echo],
      },
    }));
  },

  getFilteredPoems: () => {
    const { poems, filterMine, currentUser } = get();
    if (filterMine && currentUser) {
      return poems.filter((p) => p.authorId === currentUser.id);
    }
    return poems;
  },

  getEchoes: (poemId) => {
    return get().echoes[poemId] || [];
  },
}));
