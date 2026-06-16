import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { PageKey } from '../types';

interface AppContextValue {
  currentPage: PageKey;
  setCurrentPage: (page: PageKey) => void;
  pageTransitionDirection: 'left' | 'right';
  navigateWithTransition: (page: PageKey) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageKey>('recognition');
  const [pageTransitionDirection, setPageTransitionDirection] = useState<'left' | 'right'>('right');

  const pageOrder: PageKey[] = ['recognition', 'encyclopedia', 'favorites', 'discovery'];

  const navigateWithTransition = useCallback((page: PageKey) => {
    const currentIndex = pageOrder.indexOf(currentPage);
    const targetIndex = pageOrder.indexOf(page);
    const direction = targetIndex > currentIndex ? 'right' : 'left';
    setPageTransitionDirection(direction);
    setCurrentPage(page);
  }, [currentPage]);

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        pageTransitionDirection,
        navigateWithTransition,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
