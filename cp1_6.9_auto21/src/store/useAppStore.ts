import { create } from 'zustand';
import type { PoemData, RecordingState, CardData } from '@/types';
import { PRESET_POEMS } from '@/data/poems';
import { THEMES } from '@/data/themes';
import { detectEmotionFromLines } from '@/utils/emotionDetector';

interface AppState {
  selectedPoem: PoemData;
  selectedThemeId: string;
  customMode: boolean;
  customPoemText: string;
  recording: RecordingState;
  cards: CardData[];
  cardsLoaded: boolean;
  currentShareUrl: string | null;
  shareModalOpen: boolean;

  setSelectedPoem: (poem: PoemData) => void;
  setSelectedThemeId: (id: string) => void;
  setCustomMode: (mode: boolean) => void;
  setCustomPoemText: (text: string) => void;
  setRecording: (recording: RecordingState) => void;
  updateRecordingPartial: (partial: Partial<RecordingState>) => void;
  setCards: (cards: CardData[]) => void;
  setCardsLoaded: (loaded: boolean) => void;
  openShareModal: (url: string) => void;
  closeShareModal: () => void;
  getActivePoem: () => PoemData;
}

const initialRecordingState: RecordingState = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  audioBase64: null,
  audioMimeType: 'audio/webm',
  waveformData: new Array(16).fill(0),
};

export const useAppStore = create<AppState>((set, get) => ({
  selectedPoem: PRESET_POEMS[0],
  selectedThemeId: THEMES[0].id,
  customMode: false,
  customPoemText: '',
  recording: initialRecordingState,
  cards: [],
  cardsLoaded: false,
  currentShareUrl: null,
  shareModalOpen: false,

  setSelectedPoem: (poem) => set({ selectedPoem: poem }),
  setSelectedThemeId: (id) => set({ selectedThemeId: id }),
  setCustomMode: (mode) => set({ customMode: mode }),

  setCustomPoemText: (text) => {
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .slice(0, 20)
      .map(l => l.slice(0, 40));
    const emotion = detectEmotionFromLines(lines);
    set({
      customPoemText: text,
      selectedPoem: {
        id: 'custom',
        title: '我的诗作',
        author: '佚名',
        lines,
        emotion,
        isCustom: true,
      },
    });
  },

  setRecording: (recording) => set({ recording }),
  updateRecordingPartial: (partial) => set((state) => ({
    recording: { ...state.recording, ...partial },
  })),

  setCards: (cards) => set({ cards }),
  setCardsLoaded: (loaded) => set({ cardsLoaded: loaded }),

  openShareModal: (url) => set({ currentShareUrl: url, shareModalOpen: true }),
  closeShareModal: () => set({ currentShareUrl: null, shareModalOpen: false }),

  getActivePoem: () => {
    const state = get();
    if (state.customMode) {
      const text = state.customPoemText;
      const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .slice(0, 20)
        .map(l => l.slice(0, 40));
      const emotion = detectEmotionFromLines(lines);
      return {
        id: 'custom',
        title: '我的诗作',
        author: '佚名',
        lines,
        emotion,
        isCustom: true,
      };
    }
    return state.selectedPoem;
  },
}));
