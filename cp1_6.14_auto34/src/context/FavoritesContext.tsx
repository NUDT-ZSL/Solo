import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface FavoritesContextType {
  favoriteMap: Record<string, boolean>;
  setFavorite: (id: string, value: boolean) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string, current?: boolean) => boolean;
  initFavorites: (recipes: Array<{ id: string; favorite: boolean }>) => void;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});

  const setFavorite = useCallback((id: string, value: boolean) => {
    setFavoriteMap((prev) => ({ ...prev, [id]: value }));
  }, []);

  const isFavorite = useCallback(
    (id: string) => {
      return favoriteMap[id] === true;
    },
    [favoriteMap]
  );

  const toggleFavorite = useCallback(
    (id: string, current?: boolean): boolean => {
      const next = current !== undefined ? !current : !favoriteMap[id];
      setFavoriteMap((prev) => ({ ...prev, [id]: next }));
      return next;
    },
    [favoriteMap]
  );

  const initFavorites = useCallback((recipes: Array<{ id: string; favorite: boolean }>) => {
    setFavoriteMap((prev) => {
      const next = { ...prev };
      recipes.forEach((r) => {
        next[r.id] = r.favorite;
      });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ favoriteMap, setFavorite, isFavorite, toggleFavorite, initFavorites }),
    [favoriteMap, setFavorite, isFavorite, toggleFavorite, initFavorites]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
};
