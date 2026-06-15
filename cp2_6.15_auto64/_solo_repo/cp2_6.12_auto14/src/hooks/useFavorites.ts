import { useState, useEffect, useCallback } from 'react';

const FAVORITES_KEY = 'recipe_favorites';
const LIKES_KEY = 'recipe_likes';

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [likesAdjustments, setLikesAdjustments] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem(LIKES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(LIKES_KEY, JSON.stringify(likesAdjustments));
  }, [likesAdjustments]);

  const isFavorite = useCallback((id: number) => favorites.includes(id), [favorites]);

  const getAdjustedLikes = useCallback((id: number, baseLikes: number) => {
    return baseLikes + (likesAdjustments[id] || 0);
  }, [likesAdjustments]);

  const toggleFavorite = useCallback((id: number) => {
    let wasFavorite = false;
    setFavorites(prev => {
      wasFavorite = prev.includes(id);
      if (wasFavorite) {
        return prev.filter(fid => fid !== id);
      } else {
        return [...prev, id];
      }
    });

    setLikesAdjustments(prev => {
      const current = prev[id] || 0;
      return { ...prev, [id]: wasFavorite ? current - 1 : current + 1 };
    });

    return !wasFavorite;
  }, []);

  return { favorites, isFavorite, toggleFavorite, getAdjustedLikes };
}
