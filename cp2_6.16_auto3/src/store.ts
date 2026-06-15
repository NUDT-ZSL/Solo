import { create } from 'zustand';

export interface Note {
  note: number;
  duration: number;
}

export interface Chord {
  chord: string;
  duration: number;
  quality: 'major' | 'minor' | 'diminished';
  notes: number[];
}

export interface HistoryItem {
  id: number;
  melody: Note[];
  chords: Chord[];
  melodyText: string;
  createdAt: string;
}

interface MusicStore {
  melodyText: string;
  notes: Note[];
  chords: Chord[];
  bpm: number;
  isPlaying: boolean;
  isPaused: boolean;
  currentPosition: number;
  currentChordIndex: number;
  history: HistoryItem[];
  historyOpen: boolean;

  setMelodyText: (text: string) => void;
  setNotes: (notes: Note[]) => void;
  setChords: (chords: Chord[]) => void;
  setBpm: (bpm: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  setCurrentPosition: (pos: number) => void;
  setCurrentChordIndex: (idx: number) => void;
  setHistory: (history: HistoryItem[]) => void;
  setHistoryOpen: (open: boolean) => void;
}

export const useMusicStore = create<MusicStore>((set) => ({
  melodyText: '',
  notes: [],
  chords: [],
  bpm: 120,
  isPlaying: false,
  isPaused: false,
  currentPosition: -1,
  currentChordIndex: -1,
  history: [],
  historyOpen: false,

  setMelodyText: (text) => set({ melodyText: text }),
  setNotes: (notes) => set({ notes }),
  setChords: (chords) => set({ chords }),
  setBpm: (bpm) => set({ bpm }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setCurrentPosition: (currentPosition) => set({ currentPosition }),
  setCurrentChordIndex: (currentChordIndex) => set({ currentChordIndex }),
  setHistory: (history) => set({ history }),
  setHistoryOpen: (historyOpen) => set({ historyOpen }),
}));
