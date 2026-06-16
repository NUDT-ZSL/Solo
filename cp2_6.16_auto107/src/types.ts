export interface Book {
  id: string;
  title: string;
  author: string;
  era: string;
  description: string;
  coverUrl: string;
  pageCount: number;
}

export interface PageBlock {
  type: 'text' | 'image';
  content: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  animation: 'fade' | 'slide' | 'zoom';
}

export interface BookshelfConfig {
  position: { x: number; y: number; z: number };
  rotation: number;
  layers: number;
  booksPerLayer: number;
}

export type BookPage = PageBlock[];

export interface BookState {
  bookId: string;
  currentPage: number;
  zoom: number;
  isOpen: boolean;
  isVisible: boolean;
  flyProgress: number;
}
