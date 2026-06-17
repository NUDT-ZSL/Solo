import { useState, useCallback } from 'react';
import type { User, Recipe, Version, VersionDiff, Ingredient, Step } from '../types';

const API_BASE = '/api';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi() {
  const request = useCallback(async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: '请求失败' }));
      throw new Error(err.message || '请求失败');
    }
    return response.json();
  }, []);

  const useRequest = <T>() => {
    const [state, setState] = useState<ApiState<T>>({
      data: null,
      loading: false,
      error: null,
    });

    const execute = useCallback(async (url: string, options: RequestInit = {}) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const data = await request<T>(url, options);
        setState({ data, loading: false, error: null });
        return data;
      } catch (err: any) {
        setState({ data: null, loading: false, error: err.message });
        throw err;
      }
    }, [request]);

    return { ...state, execute };
  };

  const login = useCallback(async (username: string, password: string) => {
    return request<{ success: boolean; user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }, [request]);

  const register = useCallback(async (username: string, password: string) => {
    return request<{ success: boolean; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }, [request]);

  const getRecipes = useCallback(async (authorId?: string) => {
    const url = authorId ? `/recipes?authorId=${authorId}` : '/recipes';
    return request<{ recipes: Recipe[] }>(url);
  }, [request]);

  const createRecipe = useCallback(async (data: {
    name: string;
    ingredients: Ingredient[];
    steps: Step[];
    notes: string;
    authorId: string;
  }) => {
    return request<{ success: boolean; recipe: Recipe; version: Version }>('/recipes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }, [request]);

  const getRecipe = useCallback(async (id: string) => {
    return request<{ recipe: Recipe; currentVersion: Version }>(`/recipes/${id}`);
  }, [request]);

  const updateRecipe = useCallback(async (id: string, data: {
    name: string;
    ingredients: Ingredient[];
    steps: Step[];
    notes: string;
    commitMessage: string;
    branch: string;
    authorId: string;
  }) => {
    return request<{ success: boolean; recipe: Recipe; newVersion: Version }>(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }, [request]);

  const getVersions = useCallback(async (recipeId: string) => {
    return request<{ versions: Version[] }>(`/recipes/${recipeId}/versions`);
  }, [request]);

  const getVersion = useCallback(async (recipeId: string, versionId: string) => {
    return request<{ version: Version }>(`/recipes/${recipeId}/versions/${versionId}`);
  }, [request]);

  const createBranch = useCallback(async (
    recipeId: string,
    versionId: string,
    data: { branchName: string; commitMessage: string; authorId: string }
  ) => {
    return request<{ success: boolean; newVersion: Version }>(
      `/recipes/${recipeId}/versions/${versionId}/branch`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }, [request]);

  const mergeVersions = useCallback(async (
    recipeId: string,
    data: { sourceVersionId: string; targetBranch: string; commitMessage: string; authorId: string }
  ) => {
    return request<{ success: boolean; mergedVersion: Version }>(
      `/recipes/${recipeId}/versions/merge`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }, [request]);

  const getDiff = useCallback(async (
    recipeId: string,
    versionId1: string,
    versionId2: string
  ) => {
    return request<{ diff: VersionDiff }>(
      `/recipes/${recipeId}/versions/diff?versionId1=${versionId1}&versionId2=${versionId2}`
    );
  }, [request]);

  return {
    useRequest,
    login,
    register,
    getRecipes,
    createRecipe,
    getRecipe,
    updateRecipe,
    getVersions,
    getVersion,
    createBranch,
    mergeVersions,
    getDiff,
  };
}
