import { create } from 'zustand';
import type { MeditationRecord, EmotionType } from './types';

export type AppPage = 'tree' | 'meditate' | 'stats';

interface AppState {
  page: AppPage;
  records: MeditationRecord[];
  isMeditating: boolean;
  meditationStartTime: number | null;
  selectedEmotion: EmotionType | null;
  selectedDepth: number;
  selectedFlowerId: string | null;

  setPage: (page: AppPage) => void;
  setRecords: (records: MeditationRecord[]) => void;
  addRecord: (record: MeditationRecord) => void;
  startMeditation: () => void;
  stopMeditation: () => void;
  setSelectedEmotion: (emotion: EmotionType | null) => void;
  setSelectedDepth: (depth: number) => void;
  setSelectedFlowerId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  page: 'tree',
  records: [],
  isMeditating: false,
  meditationStartTime: null,
  selectedEmotion: null,
  selectedDepth: 3,
  selectedFlowerId: null,

  setPage: (page) => set({ page }),
  setRecords: (records) => set({ records }),
  addRecord: (record) => set((state) => ({ records: [...state.records, record] })),
  startMeditation: () => set({ isMeditating: true, meditationStartTime: Date.now() }),
  stopMeditation: () => set({ isMeditating: false, meditationStartTime: null }),
  setSelectedEmotion: (emotion) => set({ selectedEmotion: emotion }),
  setSelectedDepth: (depth) => set({ selectedDepth: depth }),
  setSelectedFlowerId: (id) => set({ selectedFlowerId: id }),
}));
