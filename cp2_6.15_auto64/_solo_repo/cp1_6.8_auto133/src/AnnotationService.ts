import type { Highlight, StickyNote, ReadingProgress, HighlightColor } from './types';

const STORAGE_KEYS = {
  HIGHLIGHTS: 'bookecho_highlights',
  STICKY_NOTES: 'bookecho_sticky_notes',
  PROGRESS: 'bookecho_reading_progress',
} as const;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export class AnnotationService {
  private highlights: Highlight[] = [];
  private stickyNotes: StickyNote[] = [];
  private progress: ReadingProgress = {
    currentPage: 0,
    totalPages: 0,
    totalReadingTime: 0,
    lastReadTimestamp: Date.now(),
  };
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private currentReadingTime: number = 0;
  private onPageChange?: (page: number) => void;
  private onTimeUpdate?: (seconds: number) => void;

  constructor(config?: {
    onPageChange?: (page: number) => void;
    onTimeUpdate?: (seconds: number) => void;
  }) {
    this.onPageChange = config?.onPageChange;
    this.onTimeUpdate = config?.onTimeUpdate;
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const savedHighlights = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
      if (savedHighlights) {
        this.highlights = JSON.parse(savedHighlights);
      }

      const savedNotes = localStorage.getItem(STORAGE_KEYS.STICKY_NOTES);
      if (savedNotes) {
        this.stickyNotes = JSON.parse(savedNotes);
      }

      const savedProgress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (savedProgress) {
        this.progress = JSON.parse(savedProgress);
      }
    } catch {
      this.highlights = [];
      this.stickyNotes = [];
    }
  }

  private saveHighlights() {
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(this.highlights));
  }

  private saveStickyNotes() {
    localStorage.setItem(STORAGE_KEYS.STICKY_NOTES, JSON.stringify(this.stickyNotes));
  }

  private saveProgress() {
    this.progress.lastReadTimestamp = Date.now();
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(this.progress));
  }

  startTimer() {
    if (this.timerInterval) return;
    this.currentReadingTime = this.progress.totalReadingTime;
    this.timerInterval = setInterval(() => {
      this.currentReadingTime++;
      this.progress.totalReadingTime = this.currentReadingTime;
      this.onTimeUpdate?.(this.currentReadingTime);
      if (this.currentReadingTime % 10 === 0) {
        this.saveProgress();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.saveProgress();
  }

  getReadingTime(): number {
    return this.currentReadingTime;
  }

  formatReadingTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  updateProgress(currentPage: number, totalPages: number) {
    this.progress.currentPage = currentPage;
    this.progress.totalPages = totalPages;
    this.saveProgress();
  }

  getProgress(): ReadingProgress {
    return { ...this.progress };
  }

  getProgressPercent(): number {
    if (this.progress.totalPages <= 1) return 100;
    return Math.round((this.progress.currentPage / (this.progress.totalPages - 1)) * 100);
  }

  addHighlight(pageId: number, startOffset: number, endOffset: number, color: HighlightColor, text: string): Highlight {
    const highlight: Highlight = {
      id: generateId(),
      pageId,
      startOffset,
      endOffset,
      color,
      text,
    };
    this.highlights.push(highlight);
    this.saveHighlights();
    return highlight;
  }

  removeHighlight(id: string) {
    this.highlights = this.highlights.filter((h) => h.id !== id);
    this.saveHighlights();
  }

  getHighlightsForPage(pageId: number): Highlight[] {
    return this.highlights.filter((h) => h.pageId === pageId);
  }

  getAllHighlights(): Highlight[] {
    return [...this.highlights];
  }

  addStickyNote(pageId: number, x: number, y: number, content: string = ''): StickyNote {
    const rotation = (Math.random() - 0.5) * 6;
    const note: StickyNote = {
      id: generateId(),
      pageId,
      x,
      y,
      rotation,
      content,
      createdAt: Date.now(),
    };
    this.stickyNotes.push(note);
    this.saveStickyNotes();
    return note;
  }

  updateStickyNote(id: string, updates: Partial<StickyNote>) {
    const index = this.stickyNotes.findIndex((n) => n.id === id);
    if (index !== -1) {
      this.stickyNotes[index] = { ...this.stickyNotes[index], ...updates };
      this.saveStickyNotes();
    }
  }

  removeStickyNote(id: string) {
    this.stickyNotes = this.stickyNotes.filter((n) => n.id !== id);
    this.saveStickyNotes();
  }

  getStickyNotesForPage(pageId: number): StickyNote[] {
    return this.stickyNotes.filter((n) => n.pageId === pageId);
  }

  getAllStickyNotes(): StickyNote[] {
    return [...this.stickyNotes];
  }

  getHighlightColorValue(color: HighlightColor): string {
    const colors: Record<HighlightColor, string> = {
      gold: 'rgba(255, 215, 0, 0.35)',
      blue: 'rgba(135, 206, 235, 0.35)',
      green: 'rgba(144, 238, 144, 0.35)',
    };
    return colors[color];
  }

  getHighlightBorderColor(color: HighlightColor): string {
    const colors: Record<HighlightColor, string> = {
      gold: 'rgba(212, 168, 75, 0.7)',
      blue: 'rgba(100, 170, 210, 0.7)',
      green: 'rgba(100, 190, 130, 0.7)',
    };
    return colors[color];
  }

  destroy() {
    this.stopTimer();
  }
}
