import { create } from 'zustand';

export type EmotionType = 'happy' | 'sad' | 'nostalgic' | 'surprised';

export interface MemoryMarker {
  id: string;
  x: number;
  y: number;
  title: string;
  content: string;
  photo?: string;
  emotionType: EmotionType;
  emotionIntensity: number;
  createdAt: number;
}

export interface MemoryMap {
  id: string;
  shareId: string;
  markers: MemoryMarker[];
  createdAt: number;
  updatedAt: number;
  creatorName: string;
}

interface AppState {
  isVisitor: boolean;
  currentMap: MemoryMap | null;
  searchQuery: string;
  matchedIds: Set<string>;
  selectedMarkerId: string | null;
  pendingPosition: { x: number; y: number } | null;
  showForm: boolean;
  autoSaveTimer: number | null;

  setVisitor: (v: boolean) => void;
  setCurrentMap: (m: MemoryMap | null) => void;
  setSearchQuery: (q: string) => void;
  setMatchedIds: (ids: Set<string>) => void;
  setSelectedMarkerId: (id: string | null) => void;
  setPendingPosition: (p: { x: number; y: number } | null) => void;
  setShowForm: (s: boolean) => void;

  addMarker: (m: MemoryMarker) => void;
  updateMarker: (id: string, patch: Partial<MemoryMarker>) => void;
  removeMarker: (id: string) => void;
  setMarkers: (markers: MemoryMarker[]) => void;

  triggerAutoSave: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isVisitor: false,
  currentMap: null,
  searchQuery: '',
  matchedIds: new Set(),
  selectedMarkerId: null,
  pendingPosition: null,
  showForm: false,
  autoSaveTimer: null,

  setVisitor: (v) => set({ isVisitor: v }),
  setCurrentMap: (m) => set({ currentMap: m }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setMatchedIds: (ids) => set({ matchedIds: ids }),
  setSelectedMarkerId: (id) => set({ selectedMarkerId: id }),
  setPendingPosition: (p) => set({ pendingPosition: p }),
  setShowForm: (s) => set({ showForm: s }),

  addMarker: (m) => {
    const map = get().currentMap;
    if (!map) return;
    const markers = [...map.markers, m];
    set({ currentMap: { ...map, markers, updatedAt: Date.now() } });
    get().triggerAutoSave();
  },

  updateMarker: (id, patch) => {
    const map = get().currentMap;
    if (!map) return;
    const markers = map.markers.map((m) => (m.id === id ? { ...m, ...patch } : m));
    set({ currentMap: { ...map, markers, updatedAt: Date.now() } });
    get().triggerAutoSave();
  },

  removeMarker: (id) => {
    const map = get().currentMap;
    if (!map) return;
    const markers = map.markers.filter((m) => m.id !== id);
    set({
      currentMap: { ...map, markers, updatedAt: Date.now() },
      selectedMarkerId: get().selectedMarkerId === id ? null : get().selectedMarkerId,
    });
    get().triggerAutoSave();
  },

  setMarkers: (markers) => {
    const map = get().currentMap;
    if (!map) return;
    set({ currentMap: { ...map, markers: markers.slice(0, 80), updatedAt: Date.now() } });
    get().triggerAutoSave();
  },

  triggerAutoSave: () => {
    const current = get().autoSaveTimer;
    if (current) window.clearTimeout(current);
    const timer = window.setTimeout(() => {
      const map = get().currentMap;
      if (map && !get().isVisitor) {
        fetch(`/api/maps/${map.shareId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markers: map.markers }),
        }).catch(() => {});
      }
    }, 30000);
    set({ autoSaveTimer: timer });
  },
}));

export const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: '#FFD700',
  sad: '#4A90D9',
  nostalgic: '#9B59B6',
  surprised: '#E74C3C',
};

export const EMOTION_LABELS: Record<EmotionType, string> = {
  happy: '快乐',
  sad: '悲伤',
  nostalgic: '怀念',
  surprised: '惊喜',
};
