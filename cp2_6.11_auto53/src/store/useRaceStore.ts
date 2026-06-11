import { create } from 'zustand';
import type {
  ProgrammingLanguage,
  AlgorithmType,
  RaceItem,
  AlgorithmResult,
  HistoryEntry
} from '../types';

interface RaceState {
  selectedLanguages: ProgrammingLanguage[];
  selectedAlgorithm: AlgorithmType | null;
  raceItems: RaceItem[];
  results: AlgorithmResult[];
  history: HistoryEntry[];
  isRacing: boolean;
  isFadingOut: boolean;
  showShareModal: boolean;
  shareImageData: string | null;

  setSelectedLanguages: (langs: ProgrammingLanguage[]) => void;
  toggleLanguage: (lang: ProgrammingLanguage) => void;
  setSelectedAlgorithm: (algo: AlgorithmType) => void;
  setRaceItems: (items: RaceItem[]) => void;
  updateRaceItem: (lang: ProgrammingLanguage, update: Partial<RaceItem>) => void;
  setResults: (results: AlgorithmResult[]) => void;
  addHistoryEntry: (entry: HistoryEntry) => void;
  setIsRacing: (racing: boolean) => void;
  setIsFadingOut: (fading: boolean) => void;
  resetRace: () => void;
  setShowShareModal: (show: boolean) => void;
  setShareImageData: (data: string | null) => void;
  clearAll: () => void;
}

export const useRaceStore = create<RaceState>((set, get) => ({
  selectedLanguages: [],
  selectedAlgorithm: null,
  raceItems: [],
  results: [],
  history: [],
  isRacing: false,
  isFadingOut: false,
  showShareModal: false,
  shareImageData: null,

  setSelectedLanguages: (langs) => set({ selectedLanguages: langs }),

  toggleLanguage: (lang) => {
    const { selectedLanguages } = get();
    if (selectedLanguages.includes(lang)) {
      set({ selectedLanguages: selectedLanguages.filter((l) => l !== lang) });
    } else if (selectedLanguages.length < 4) {
      set({ selectedLanguages: [...selectedLanguages, lang] });
    }
  },

  setSelectedAlgorithm: (algo) => set({ selectedAlgorithm: algo }),

  setRaceItems: (items) => set({ raceItems: items }),

  updateRaceItem: (lang, update) => {
    set((state) => ({
      raceItems: state.raceItems.map((item) =>
        item.language === lang ? { ...item, ...update } : item
      )
    }));
  },

  setResults: (results) => set({ results }),

  addHistoryEntry: (entry) => {
    set((state) => {
      const newHistory = [entry, ...state.history].slice(0, 5);
      return { history: newHistory };
    });
  },

  setIsRacing: (racing) => set({ isRacing: racing }),

  setIsFadingOut: (fading) => set({ isFadingOut: fading }),

  resetRace: () => {
    set({
      raceItems: [],
      results: [],
      isRacing: false,
      isFadingOut: false
    });
  },

  setShowShareModal: (show) => set({ showShareModal: show }),

  setShareImageData: (data) => set({ shareImageData: data }),

  clearAll: () => {
    set({
      selectedLanguages: [],
      selectedAlgorithm: null,
      raceItems: [],
      results: [],
      history: [],
      isRacing: false,
      isFadingOut: false,
      showShareModal: false,
      shareImageData: null
    });
  }
}));
