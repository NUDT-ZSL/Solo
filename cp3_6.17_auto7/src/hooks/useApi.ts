import { useState, useCallback } from 'react';
import type { User, Recipe, RecipeVersion, RecipeContent, VersionDiff } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async (username: string, password: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      return await request<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '注册失败');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      return await request<User>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecipes = useCallback(async (userId: string): Promise<Recipe[]> => {
    setLoading(true);
    setError(null);
    try {
      return await request<Recipe[]>(`/recipes?userId=${userId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取食谱列表失败');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecipe = useCallback(async (recipeId: string): Promise<Recipe> => {
    setLoading(true);
    setError(null);
    try {
      return await request<Recipe>(`/recipes/${recipeId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取食谱失败');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecipe = useCallback(async (userId: string, content: RecipeContent, authorName: string): Promise<Recipe> => {
    setLoading(true);
    setError(null);
    try {
      return await request<Recipe>('/recipes', {
        method: 'POST',
        body: JSON.stringify({ userId, content, authorName }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建食谱失败');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const createVersion = useCallback(async (
    recipeId: string,
    content: RecipeContent,
    parentVersionId: string,
    message: string,
    authorId: string,
    authorName: string,
  ): Promise<RecipeVersion> => {
    setLoading(true);
    setError(null);
    try {
      return await request<RecipeVersion>(`/recipes/${recipeId}/versions`, {
        method: 'POST',
        body: JSON.stringify({ content, parentVersionId, message, authorId, authorName }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建版本失败');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const createBranch = useCallback(async (
    recipeId: string,
    fromVersionId: string,
    branchName: string,
    authorId: string,
    authorName: string,
  ): Promise<RecipeVersion> => {
    setLoading(true);
    setError(null);
    try {
      return await request<RecipeVersion>(`/recipes/${recipeId}/branch`, {
        method: 'POST',
        body: JSON.stringify({ fromVersionId, branchName, authorId, authorName }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建分支失败');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const mergeVersions = useCallback(async (
    recipeId: string,
    targetVersionId: string,
    sourceVersionId: string,
    authorId: string,
    authorName: string,
  ): Promise<RecipeVersion> => {
    setLoading(true);
    setError(null);
    try {
      return await request<RecipeVersion>(`/recipes/${recipeId}/merge`, {
        method: 'POST',
        body: JSON.stringify({ targetVersionId, sourceVersionId, authorId, authorName }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '合并失败');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVersionDiff = useCallback(async (
    recipeId: string,
    versionId1: string,
    versionId2: string,
  ): Promise<VersionDiff> => {
    setLoading(true);
    setError(null);
    try {
      return await request<VersionDiff>(
        `/recipes/${recipeId}/diff?versionId1=${versionId1}&versionId2=${versionId2}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取差异失败');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const rollbackToVersion = useCallback(async (
    recipeId: string,
    versionId: string,
    authorId: string,
    authorName: string,
  ): Promise<RecipeVersion> => {
    setLoading(true);
    setError(null);
    try {
      return await request<RecipeVersion>(`/recipes/${recipeId}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ versionId, authorId, authorName }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '回滚失败');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    register,
    login,
    getRecipes,
    getRecipe,
    createRecipe,
    createVersion,
    createBranch,
    mergeVersions,
    getVersionDiff,
    rollbackToVersion,
  };
}
