export interface BookPage {
  id: number;
  text: string;
  illustrationUrl?: string;
}

export interface BookData {
  title: string;
  author: string;
  pages: BookPage[];
}

export interface Highlight {
  id: string;
  pageId: number;
  startOffset: number;
  endOffset: number;
  color: HighlightColor;
  text: string;
}

export type HighlightColor = 'gold' | 'blue' | 'green';

export interface StickyNote {
  id: string;
  pageId: number;
  x: number;
  y: number;
  rotation: number;
  content: string;
  createdAt: number;
}

export interface ReadingProgress {
  currentPage: number;
  totalPages: number;
  totalReadingTime: number;
  lastReadTimestamp: number;
}

export type FlipState = 'idle' | 'dragging' | 'animating';

export type FlipDirection = 'next' | 'prev';

export interface FlipParams {
  direction: FlipDirection;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  progress: number;
}

export interface BookEngineConfig {
  canvas: HTMLCanvasElement;
  pageWidth: number;
  pageHeight: number;
  onFlipComplete?: (direction: FlipDirection) => void;
  onFlipProgress?: (progress: number) => void;
}
