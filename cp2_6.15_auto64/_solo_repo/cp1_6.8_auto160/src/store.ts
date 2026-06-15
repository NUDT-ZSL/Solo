import { create } from "zustand";
import type { ChapterData } from "./ScrollEngine";
import { getScrollEngine } from "./ScrollEngine";

interface BookStore {
  currentChapter: number;
  completedChapters: number[];
  chapters: ChapterData[];
  isScrollAnimating: boolean;
  jumpMenuOpen: boolean;
  setJumpMenuOpen: (open: boolean) => void;
  setScrollAnimating: (animating: boolean) => void;
  completeCurrentChapter: () => void;
  jumpToChapter: (index: number) => void;
  reset: () => void;
  getProgress: () => number;
  getRemaining: () => number;
}

const engine = getScrollEngine();

export const useBookStore = create<BookStore>((set, get) => ({
  currentChapter: 0,
  completedChapters: [],
  chapters: engine.getChapters(),
  isScrollAnimating: false,
  jumpMenuOpen: false,

  setJumpMenuOpen: (open) => set({ jumpMenuOpen: open }),

  setScrollAnimating: (animating) => set({ isScrollAnimating: animating }),

  completeCurrentChapter: () => {
    const state = get();
    const newCompleted = [...state.completedChapters];
    if (!newCompleted.includes(state.currentChapter)) {
      newCompleted.push(state.currentChapter);
    }
    engine.completeCurrentChapter();
    set({
      currentChapter: engine.getCurrentChapterIndex(),
      completedChapters: newCompleted,
      isScrollAnimating: true,
    });
    setTimeout(() => set({ isScrollAnimating: false }), 800);
  },

  jumpToChapter: (index) => {
    engine.jumpToChapter(index);
    set({
      currentChapter: index,
      isScrollAnimating: true,
    });
    setTimeout(() => set({ isScrollAnimating: false }), 800);
  },

  reset: () => {
    engine.reset();
    set({
      currentChapter: 0,
      completedChapters: [],
      isScrollAnimating: false,
      jumpMenuOpen: false,
    });
  },

  getProgress: () => {
    const state = get();
    return state.completedChapters.length / state.chapters.length;
  },

  getRemaining: () => {
    const state = get();
    return state.chapters.length - state.completedChapters.length;
  },
}));
