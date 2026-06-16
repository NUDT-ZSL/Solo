import { useState, useCallback } from 'react';

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Step {
  id: number;
  audio: string;
  description: string;
}

export interface Recipe {
  id: string;
  category: string;
  name: string;
  thumbnail: string;
  steps: Step[];
  funFacts: string[];
}

export interface GameRecord {
  id: string;
  recipeId: string;
  recipeName: string;
  category: string;
  timeUsed: number;
  score: number;
  accuracy: number;
  timestamp: string;
}

export interface GameStats {
  totalGames: number;
  averageAccuracy: number;
  highestScore: number;
}

const API_BASE = '/api';

export function useGameRecords() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async (): Promise<Category[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecipes = useCallback(async (category?: string): Promise<Recipe[]> => {
    setLoading(true);
    setError(null);
    try {
      const url = category 
        ? `${API_BASE}/recipes?category=${category}` 
        : `${API_BASE}/recipes`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch recipes');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecipe = useCallback(async (id: string): Promise<Recipe> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/recipes/${id}`);
      if (!response.ok) throw new Error('Failed to fetch recipe');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGameStats = useCallback(async (): Promise<GameStats> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/game-stats`);
      if (!response.ok) throw new Error('Failed to fetch game stats');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGameRecords = useCallback(async (): Promise<GameRecord[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/game-records`);
      if (!response.ok) throw new Error('Failed to fetch game records');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitGameRecord = useCallback(async (
    record: Omit<GameRecord, 'id' | 'timestamp'>
  ): Promise<GameRecord> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/game-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });
      if (!response.ok) throw new Error('Failed to submit game record');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchCategories,
    fetchRecipes,
    fetchRecipe,
    fetchGameStats,
    fetchGameRecords,
    submitGameRecord,
  };
}
