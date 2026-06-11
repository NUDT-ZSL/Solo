import { create } from 'zustand';
import type { Project, User, Chapter, Annotation, Character, ConflictItem, SentenceSentiment, CharacterGraphData } from './types';

interface Store {
  userId: string;
  userName: string;
  userColor: string;
  project: Project | null;
  currentChapterId: string | null;
  onlineUsers: User[];
  conflicts: ConflictItem[];
  sentiments: SentenceSentiment[];
  characterGraph: CharacterGraphData;
  analysisPanelWidth: number;
  showAnnotations: boolean;
  drawerOpen: boolean;

  setUser: (id: string, name: string, color: string) => void;
  setProject: (project: Project) => void;
  setCurrentChapterId: (id: string) => void;
  addOnlineUser: (user: User) => void;
  removeOnlineUser: (userId: string) => void;
  updateChapterContent: (chapterId: string, content: string) => void;
  reorderChapters: (fromId: string, toId: string) => void;
  toggleChapterExpand: (chapterId: string) => void;
  addAnnotation: (annotation: Annotation) => void;
  addCharacter: (character: Character) => void;
  setConflicts: (conflicts: ConflictItem[]) => void;
  setSentiments: (sentiments: SentenceSentiment[]) => void;
  setCharacterGraph: (data: CharacterGraphData) => void;
  setAnalysisPanelWidth: (width: number) => void;
  setShowAnnotations: (show: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
}

const defaultGraph: CharacterGraphData = { nodes: [], links: [] };

export const useStore = create<Store>((set, get) => ({
  userId: '',
  userName: '',
  userColor: '#4da6ff',
  project: null,
  currentChapterId: null,
  onlineUsers: [],
  conflicts: [],
  sentiments: [],
  characterGraph: defaultGraph,
  analysisPanelWidth: 380,
  showAnnotations: false,
  drawerOpen: false,

  setUser: (id, name, color) => set({ userId: id, userName: name, userColor: color }),

  setProject: (project) =>
    set({
      project,
      currentChapterId: project.chapters[0]?.id ?? null,
    }),

  setCurrentChapterId: (id) => set({ currentChapterId: id }),

  addOnlineUser: (user) => {
    const existing = get().onlineUsers.find((u) => u.id === user.id);
    if (!existing) {
      set({ onlineUsers: [...get().onlineUsers, user] });
    }
  },

  removeOnlineUser: (userId) =>
    set({ onlineUsers: get().onlineUsers.filter((u) => u.id !== userId) }),

  updateChapterContent: (chapterId, content) => {
    const project = get().project;
    if (!project) return;
    const chapters = project.chapters.map((c) =>
      c.id === chapterId ? { ...c, content } : c
    );
    set({ project: { ...project, chapters } });
  },

  reorderChapters: (fromId, toId) => {
    const project = get().project;
    if (!project) return;
    const chapters = [...project.chapters];
    const fromIdx = chapters.findIndex((c) => c.id === fromId);
    const toIdx = chapters.findIndex((c) => c.id === toId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const [moved] = chapters.splice(fromIdx, 1);
    chapters.splice(toIdx, 0, moved);
    const reordered = chapters.map((c, i) => ({ ...c, order: i }));
    set({ project: { ...project, chapters: reordered } });
  },

  toggleChapterExpand: (chapterId) => {
    const project = get().project;
    if (!project) return;
    const chapters = project.chapters.map((c) =>
      c.id === chapterId ? { ...c, expanded: !c.expanded } : c
    );
    set({ project: { ...project, chapters } });
  },

  addAnnotation: (annotation) => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        annotations: [...project.annotations, annotation],
      },
    });
  },

  addCharacter: (character) => {
    const project = get().project;
    if (!project) return;
    const exists = project.characters.some((c) => c.name === character.name);
    if (exists) return;
    set({
      project: {
        ...project,
        characters: [...project.characters, character],
      },
    });
  },

  setConflicts: (conflicts) => set({ conflicts }),
  setSentiments: (sentiments) => set({ sentiments }),
  setCharacterGraph: (data) => set({ characterGraph: data }),
  setAnalysisPanelWidth: (width) => set({ analysisPanelWidth: width }),
  setShowAnnotations: (show) => set({ showAnnotations: show }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
}));
