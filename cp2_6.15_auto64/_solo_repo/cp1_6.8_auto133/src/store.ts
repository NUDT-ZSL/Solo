import { create } from 'zustand';
import type { BookPage, Highlight, StickyNote, HighlightColor, FlipDirection } from './types';

interface ReaderState {
  pages: BookPage[];
  currentPage: number;
  totalPages: number;
  bookTitle: string;
  bookAuthor: string;
  readingTime: number;
  isReading: boolean;
  fontSize: number;
  highlightColor: HighlightColor;
  highlights: Highlight[];
  stickyNotes: StickyNote[];
  autoFlip: boolean;
  autoFlipInterval: number;
  flipDirection: FlipDirection | null;
  isFlipping: boolean;

  setPages: (pages: BookPage[]) => void;
  setBookInfo: (title: string, author: string) => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  goToFirst: () => void;
  goToLast: () => void;
  setReadingTime: (time: number) => void;
  incrementReadingTime: () => void;
  setIsReading: (reading: boolean) => void;
  setFontSize: (size: number) => void;
  setHighlightColor: (color: HighlightColor) => void;
  addHighlight: (highlight: Highlight) => void;
  removeHighlight: (id: string) => void;
  setHighlights: (highlights: Highlight[]) => void;
  addStickyNote: (note: StickyNote) => void;
  updateStickyNote: (id: string, updates: Partial<StickyNote>) => void;
  removeStickyNote: (id: string) => void;
  setStickyNotes: (notes: StickyNote[]) => void;
  setAutoFlip: (enabled: boolean) => void;
  setAutoFlipInterval: (interval: number) => void;
  setFlipDirection: (direction: FlipDirection | null) => void;
  setIsFlipping: (flipping: boolean) => void;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  pages: [],
  currentPage: 0,
  totalPages: 0,
  bookTitle: '',
  bookAuthor: '',
  readingTime: 0,
  isReading: true,
  fontSize: 18,
  highlightColor: 'gold',
  highlights: [],
  stickyNotes: [],
  autoFlip: false,
  autoFlipInterval: 5,
  flipDirection: null,
  isFlipping: false,

  setPages: (pages) => set({ pages, totalPages: pages.length }),
  setBookInfo: (title, author) => set({ bookTitle: title, bookAuthor: author }),
  setCurrentPage: (page) => set({ currentPage: page }),
  nextPage: () => {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages - 1) {
      set({ currentPage: currentPage + 1, flipDirection: 'next', isFlipping: true });
    }
  },
  prevPage: () => {
    const { currentPage } = get();
    if (currentPage > 0) {
      set({ currentPage: currentPage - 1, flipDirection: 'prev', isFlipping: true });
    }
  },
  goToPage: (page) => {
    const { totalPages } = get();
    if (page >= 0 && page < totalPages) {
      set({ currentPage: page });
    }
  },
  goToFirst: () => set({ currentPage: 0 }),
  goToLast: () => {
    const { totalPages } = get();
    set({ currentPage: totalPages - 1 });
  },
  setReadingTime: (time) => set({ readingTime: time }),
  incrementReadingTime: () => set((state) => ({ readingTime: state.readingTime + 1 })),
  setIsReading: (reading) => set({ isReading: reading }),
  setFontSize: (size) => set({ fontSize: size }),
  setHighlightColor: (color) => set({ highlightColor: color }),
  addHighlight: (highlight) => set((state) => ({ highlights: [...state.highlights, highlight] })),
  removeHighlight: (id) => set((state) => ({ highlights: state.highlights.filter((h) => h.id !== id) })),
  setHighlights: (highlights) => set({ highlights }),
  addStickyNote: (note) => set((state) => ({ stickyNotes: [...state.stickyNotes, note] })),
  updateStickyNote: (id, updates) =>
    set((state) => ({
      stickyNotes: state.stickyNotes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  removeStickyNote: (id) => set((state) => ({ stickyNotes: state.stickyNotes.filter((n) => n.id !== id) })),
  setStickyNotes: (notes) => set({ stickyNotes: notes }),
  setAutoFlip: (enabled) => set({ autoFlip: enabled }),
  setAutoFlipInterval: (interval) => set({ autoFlipInterval: interval }),
  setFlipDirection: (direction) => set({ flipDirection: direction }),
  setIsFlipping: (flipping) => set({ isFlipping: flipping }),
}));
