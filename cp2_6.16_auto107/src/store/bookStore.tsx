import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { BookState } from '../types';

interface BookStoreState {
  openBooks: BookState[];
  activeBookId: string | null;
  searchQuery: string;
  isLoading: boolean;
}

interface BookStoreActions {
  openBook: (id: string, pageCount: number) => void;
  closeBook: (id: string) => void;
  turnPage: (id: string, direction: 'left' | 'right') => void;
  zoomPage: (id: string, delta: number) => void;
  setActiveBook: (id: string) => void;
  toggleBookVisibility: (id: string) => void;
  setSearchQuery: (query: string) => void;
}

type BookStoreContext = BookStoreState & BookStoreActions;

const BookContext = createContext<BookStoreContext | null>(null);

export function BookProvider({ children }: { children: ReactNode }) {
  const [openBooks, setOpenBooks] = useState<BookState[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const openBook = useCallback((id: string, pageCount: number) => {
    setOpenBooks(prev => {
      if (prev.some(b => b.bookId === id)) {
        return prev;
      }
      const newBook: BookState = {
        bookId: id,
        pageCount,
        currentPage: 0,
        zoom: 1.0,
        isOpen: true,
        isVisible: true,
        flyProgress: 0,
      };
      const next = prev.length >= 3 ? [...prev.slice(1), newBook] : [...prev, newBook];
      return next;
    });
    setActiveBookId(id);
  }, []);

  const closeBook = useCallback((id: string) => {
    setOpenBooks(prev => prev.filter(b => b.bookId !== id));
    setActiveBookId(prev => (prev === id ? null : prev));
  }, []);

  const turnPage = useCallback((id: string, direction: 'left' | 'right') => {
    setOpenBooks(prev =>
      prev.map(book => {
        if (book.bookId !== id) return book;
        const delta = direction === 'right' ? 1 : -1;
        const maxPage = Math.max(0, book.pageCount - 1);
        const nextPage = Math.min(maxPage, Math.max(0, book.currentPage + delta));
        return { ...book, currentPage: nextPage };
      })
    );
  }, []);

  const zoomPage = useCallback((id: string, delta: number) => {
    setOpenBooks(prev =>
      prev.map(book => {
        if (book.bookId !== id) return book;
        const nextZoom = Math.min(2.0, Math.max(0.5, book.zoom + delta));
        return { ...book, zoom: nextZoom };
      })
    );
  }, []);

  const toggleBookVisibility = useCallback((id: string) => {
    setOpenBooks(prev =>
      prev.map(book =>
        book.bookId === id ? { ...book, isVisible: !book.isVisible } : book
      )
    );
  }, []);

  const handleSetActiveBook = useCallback((id: string) => {
    setActiveBookId(id);
  }, []);

  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const value: BookStoreContext = {
    openBooks,
    activeBookId,
    searchQuery,
    isLoading,
    openBook,
    closeBook,
    turnPage,
    zoomPage,
    setActiveBook: handleSetActiveBook,
    toggleBookVisibility,
    setSearchQuery: handleSetSearchQuery,
  };

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>;
}

export function useBookStore(): BookStoreContext {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error('useBookStore must be used within a BookProvider');
  }
  return context;
}
