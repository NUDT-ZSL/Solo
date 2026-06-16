import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Style } from '../types';

interface AppContextType {
  selectedWorkId: number | null;
  filterStyle: Style | 'all';
  favorites: number[];
  setSelectedWorkId: (id: number | null) => void;
  setFilterStyle: (style: Style | 'all') => void;
  toggleFavorite: (id: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);
  const [filterStyle, setFilterStyle] = useState<Style | 'all'>('all');
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = (id: number) => {
    setFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(fav => fav !== id)
        : [...prev, id]
    );
  };

  return (
    <AppContext.Provider value={{
      selectedWorkId,
      filterStyle,
      favorites,
      setSelectedWorkId,
      setFilterStyle,
      toggleFavorite
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
