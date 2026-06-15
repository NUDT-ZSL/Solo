import { create } from "zustand";
import { DiaryEntry, TimelinePoint, diaryEngine } from "./DiaryEngine";

interface DiaryStore {
  diaries: DiaryEntry[];
  timeline: TimelinePoint[];
  isLoading: boolean;
  selectedDiary: DiaryEntry | null;
  fetchDiaries: () => Promise<void>;
  fetchTimeline: () => Promise<void>;
  createDiary: (content: string, date?: string) => Promise<DiaryEntry | null>;
  deleteDiary: (id: string) => Promise<void>;
  setSelectedDiary: (diary: DiaryEntry | null) => void;
}

export const useDiaryStore = create<DiaryStore>((set, get) => ({
  diaries: [],
  timeline: [],
  isLoading: false,
  selectedDiary: null,

  fetchDiaries: async () => {
    set({ isLoading: true });
    try {
      const diaries = await diaryEngine.fetchDiaries();
      set({ diaries, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchTimeline: async () => {
    try {
      const timeline = await diaryEngine.fetchTimeline();
      set({ timeline });
    } catch {
      // keep existing timeline
    }
  },

  createDiary: async (content: string, date?: string) => {
    try {
      const entry = await diaryEngine.createDiary(content, date);
      const diaries = await diaryEngine.fetchDiaries();
      const timeline = await diaryEngine.fetchTimeline();
      set({ diaries, timeline });
      return entry;
    } catch {
      return null;
    }
  },

  deleteDiary: async (id: string) => {
    await diaryEngine.deleteDiary(id);
    const { selectedDiary } = get();
    if (selectedDiary?.id === id) {
      set({ selectedDiary: null });
    }
    const diaries = await diaryEngine.fetchDiaries();
    const timeline = await diaryEngine.fetchTimeline();
    set({ diaries, timeline });
  },

  setSelectedDiary: (diary: DiaryEntry | null) => {
    set({ selectedDiary: diary });
  },
}));
