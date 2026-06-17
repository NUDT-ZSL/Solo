import { useState, useCallback } from 'react';
import type { User, Recipe, Version, RecipeDiff, RecipeContent } from '../types';

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      const data: ApiResponse<T> = await response.json();
      if (!data.success || !data.data) {
        throw new Error(data.error || '请求失败');
      }
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (username: string, password: string) =>
    request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

  const register = (username: string, password: string) =>
    request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

  const getRecipes = (userId: string) =>
    request<Recipe[]>(`/recipes?userId=${userId}`);

  const getRecipe = (recipeId: string) =>
    request<Recipe>(`/recipes/${recipeId}`);

  const createRecipe = (userId: string, name: string, content: RecipeContent) =>
    request<Recipe>('/recipes', {
      method: 'POST',
      body: JSON.stringify({ userId, name, content }),
    });

  const saveVersion = (
    recipeId: string,
    content: RecipeContent,
    message: string,
    branch: string,
    parentIds: string[]
  ) =>
    request<Version>('/versions', {
      method: 'POST',
      body: JSON.stringify({ recipeId, content, message, branch, parentIds }),
    });

  const createBranch = (
    recipeId: string,
    versionId: string,
    branchName: string
  ) =>
    request<Version>(`/versions/${versionId}/branch`, {
      method: 'POST',
      body: JSON.stringify({ recipeId, branchName }),
    });

  const mergeVersions = (
    recipeId: string,
    targetBranch: string,
    sourceVersionId: string,
    message: string
  ) =>
    request<Version>(`/versions/${sourceVersionId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ recipeId, targetBranch, message }),
    });

  const getVersion = (versionId: string) =>
    request<Version>(`/versions/${versionId}`);

  const getVersions = (recipeId: string) =>
    request<Version[]>(`/versions?recipeId=${recipeId}`);

  const getDiff = (version1Id: string, version2Id: string) =>
    request<RecipeDiff>(`/versions/diff?version1Id=${version1Id}&version2Id=${version2Id}`);

  return {
    loading,
    error,
    login,
    register,
    getRecipes,
    getRecipe,
    createRecipe,
    saveVersion,
    createBranch,
    mergeVersions,
    getVersion,
    getVersions,
    getDiff,
  };
}
