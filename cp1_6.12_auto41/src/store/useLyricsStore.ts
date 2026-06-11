import { create } from 'zustand';
import { LyricsData, LyricLine, PlayerState, ExportProgress } from '../types';

type StateUpdater<T> = T | ((prev: T) => T);

interface LyricsStore {
  lyricsData: LyricsData | null;
  selectedLineId: string | null;
  playerState: PlayerState;
  exportProgress: ExportProgress;
  
  setLyricsData: (data: LyricsData) => void;
  updateLyricLine: (id: string, updates: Partial<LyricLine>) => void;
  reorderLyricLines: (fromIndex: number, toIndex: number) => void;
  selectLine: (id: string | null) => void;
  setPlayerState: (state: StateUpdater<Partial<PlayerState>>) => void;
  setExportProgress: (progress: Partial<ExportProgress>) => void;
  clearAll: () => void;
}

const initialPlayerState: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
};

const initialExportProgress: ExportProgress = {
  status: 'idle',
  progress: 0,
};

export const useLyricsStore = create<LyricsStore>((set) => ({
  lyricsData: null,
  selectedLineId: null,
  playerState: initialPlayerState,
  exportProgress: initialExportProgress,

  setLyricsData: (data) => set({
    lyricsData: data,
    playerState: {
      ...initialPlayerState,
      duration: data.totalDuration,
    },
    selectedLineId: data.lines.length > 0 ? data.lines[0].id : null,
  }),

  updateLyricLine: (id, updates) => set((state) => {
    if (!state.lyricsData) return state;
    
    const newLines = state.lyricsData.lines.map((line) =>
      line.id === id ? { ...line, ...updates } : line
    );
    
    const totalDuration = newLines.length > 0
      ? Math.max(...newLines.map(l => l.endTime))
      : 0;

    return {
      lyricsData: {
        ...state.lyricsData,
        lines: newLines,
        totalDuration: Math.round(totalDuration * 10) / 10,
      },
      playerState: {
        ...state.playerState,
        duration: Math.round(totalDuration * 10) / 10,
      },
    };
  }),

  reorderLyricLines: (fromIndex, toIndex) => set((state) => {
    if (!state.lyricsData) return state;
    
    const newLines = [...state.lyricsData.lines];
    const [removed] = newLines.splice(fromIndex, 1);
    newLines.splice(toIndex, 0, removed);
    
    newLines.forEach((line, index) => {
      const startTime = index === 0 ? 0 : newLines[index - 1].endTime;
      const duration = line.endTime - line.startTime;
      line.startTime = Math.round(startTime * 10) / 10;
      line.endTime = Math.round((startTime + duration) * 10) / 10;
    });

    const totalDuration = newLines.length > 0
      ? newLines[newLines.length - 1].endTime
      : 0;

    return {
      lyricsData: {
        ...state.lyricsData,
        lines: newLines,
        totalDuration: Math.round(totalDuration * 10) / 10,
      },
      playerState: {
        ...state.playerState,
        duration: Math.round(totalDuration * 10) / 10,
      },
    };
  }),

  selectLine: (id) => set({ selectedLineId: id }),

  setPlayerState: (newState) => set((state) => {
    const updates = typeof newState === 'function' ? newState(state.playerState) : newState;
    return {
      playerState: { ...state.playerState, ...updates },
    };
  }),

  setExportProgress: (progress) => set((state) => ({
    exportProgress: { ...state.exportProgress, ...progress },
  })),

  clearAll: () => set({
    lyricsData: null,
    selectedLineId: null,
    playerState: initialPlayerState,
    exportProgress: initialExportProgress,
  }),
}));
