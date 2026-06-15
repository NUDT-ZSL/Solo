import { create } from 'zustand';
import { GraphData, GraphNode, HistoryEntry, WordData } from './types';
import { StarGraphEngine } from './StarGraphEngine';

interface AppState {
  currentGraph: GraphData | null;
  selectedNode: GraphNode | null;
  history: HistoryEntry[];
  isLoading: boolean;
  searchQuery: string;
  historyOpen: boolean;
  infoCardPosition: { x: number; y: number } | null;
  engine: StarGraphEngine;

  setCurrentGraph: (graph: GraphData | null) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  addToHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setHistoryOpen: (open: boolean) => void;
  setInfoCardPosition: (pos: { x: number; y: number } | null) => void;

  searchWord: (word: string) => Promise<void>;
  randomExplore: () => Promise<void>;
  loadHistoryEntry: (index: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentGraph: null,
  selectedNode: null,
  history: [],
  isLoading: false,
  searchQuery: '',
  historyOpen: false,
  infoCardPosition: null,
  engine: new StarGraphEngine(),

  setCurrentGraph: (graph) => set({ currentGraph: graph }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  addToHistory: (entry) => set((state) => ({ history: [entry, ...state.history] })),
  clearHistory: () => set({ history: [] }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setHistoryOpen: (open) => set({ historyOpen: open }),
  setInfoCardPosition: (pos) => set({ infoCardPosition: pos }),

  searchWord: async (word: string) => {
    const { engine, currentGraph } = get();
    set({ isLoading: true, selectedNode: null });
    try {
      const data = await engine.fetchAssociations(word);
      const graph = engine.buildGraph(word, data);
      set({ currentGraph: graph, isLoading: false });
      const entry: HistoryEntry = { word, graphData: graph, timestamp: Date.now() };
      set((state) => ({ history: [entry, ...state.history] }));
    } catch {
      set({ isLoading: false });
    }
  },

  randomExplore: async () => {
    const { engine } = get();
    set({ isLoading: true, selectedNode: null });
    try {
      const data = await engine.fetchRandom();
      const graph = engine.buildGraph(data.word, data);
      set({ currentGraph: graph, isLoading: false, searchQuery: data.word });
      const entry: HistoryEntry = { word: data.word, graphData: graph, timestamp: Date.now() };
      set((state) => ({ history: [entry, ...state.history] }));
    } catch {
      set({ isLoading: false });
    }
  },

  loadHistoryEntry: (index: number) => {
    const { history } = get();
    if (history[index]) {
      set({ currentGraph: history[index].graphData, selectedNode: null, searchQuery: history[index].word });
    }
  },
}));
