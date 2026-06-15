import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Recipe, FilterState } from '../types';

export function useFilter(recipes: Recipe[]) {
  const [state, setState] = useState<FilterState>({
    searchQuery: '',
    selectedTags: [],
    selectedCuisine: null,
    selectedDifficulty: null
  });
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setState(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag]
    }));
  }, []);

  const setCuisine = useCallback((cuisine: string | null) => {
    setState(prev => ({ ...prev, selectedCuisine: cuisine }));
  }, []);

  const setDifficulty = useCallback((difficulty: string | null) => {
    setState(prev => ({ ...prev, selectedDifficulty: difficulty }));
  }, []);

  const clearFilters = useCallback(() => {
    setState({
      searchQuery: '',
      selectedTags: [],
      selectedCuisine: null,
      selectedDifficulty: null
    });
    setDebouncedQuery('');
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return recipes.filter(recipe => {
      if (q) {
        const matchQuery =
          recipe.name.toLowerCase().includes(q) ||
          recipe.cuisine.toLowerCase().includes(q) ||
          recipe.description.toLowerCase().includes(q) ||
          recipe.ingredients.some(ing => ing.name.toLowerCase().includes(q)) ||
          recipe.tags.some(t => t.toLowerCase().includes(q));
        if (!matchQuery) return false;
      }
      if (state.selectedCuisine && recipe.cuisine !== state.selectedCuisine) {
        return false;
      }
      if (state.selectedDifficulty && recipe.difficulty !== state.selectedDifficulty) {
        return false;
      }
      if (state.selectedTags.length > 0) {
        const hasAll = state.selectedTags.every(t => recipe.tags.includes(t));
        if (!hasAll) return false;
      }
      return true;
    });
  }, [recipes, debouncedQuery, state.selectedCuisine, state.selectedDifficulty, state.selectedTags]);

  return {
    state,
    debouncedQuery,
    filtered,
    setSearchQuery,
    toggleTag,
    setCuisine,
    setDifficulty,
    clearFilters
  };
}
