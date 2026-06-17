import { useState, useCallback } from 'react';
import type {
  User,
  Recipe,
  Version,
  VersionDiff,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  CreateBranchRequest,
  MergeBranchRequest,
  RollbackRequest,
  UseApiReturn
} from '@/types';

const API_BASE = '/api';

export function useApi(): UseApiReturn {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const persistUser = (userData: User | null) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userId', userData.id);
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
    }
  };

  const getUserId = (): string | null => {
    return user?.id || localStorage.getItem('userId');
  };

  const request = useCallback(async <T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    const userId = getUserId();
    if (userId) {
      headers['x-user-id'] = userId;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const error = await response.json();
        message = error.message || message;
      } catch {
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }, [user]);

  const login = async (username: string, password: string): Promise<void> => {
    const userData = await request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    persistUser(userData);
  };

  const register = async (username: string, password: string): Promise<void> => {
    const userData = await request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    persistUser(userData);
  };

  const logout = (): void => {
    persistUser(null);
  };

  const getRecipes = async (): Promise<Recipe[]> => {
    return request<Recipe[]>('/recipes');
  };

  const getRecipe = async (id: string): Promise<Recipe> => {
    return request<Recipe>(`/recipes/${id}`);
  };

  const createRecipe = async (data: CreateRecipeRequest): Promise<Recipe> => {
    return request<Recipe>('/recipes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  const updateRecipe = async (id: string, data: UpdateRecipeRequest): Promise<Recipe> => {
    return request<Recipe>(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  };

  const deleteRecipe = async (id: string): Promise<void> => {
    return request<void>(`/recipes/${id}`, {
      method: 'DELETE'
    });
  };

  const getVersions = async (recipeId: string): Promise<Version[]> => {
    return request<Version[]>(`/recipes/${recipeId}/versions`);
  };

  const getVersion = async (recipeId: string, versionId: string): Promise<Version> => {
    return request<Version>(`/recipes/${recipeId}/versions/${versionId}`);
  };

  const getDiff = async (
    recipeId: string,
    versionId1: string,
    versionId2: string
  ): Promise<VersionDiff> => {
    return request<VersionDiff>(
      `/recipes/${recipeId}/diff?from=${versionId1}&to=${versionId2}`
    );
  };

  const createBranch = async (
    recipeId: string,
    data: CreateBranchRequest
  ): Promise<Version> => {
    return request<Version>(`/recipes/${recipeId}/branch`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  const mergeBranch = async (
    recipeId: string,
    data: MergeBranchRequest
  ): Promise<Version> => {
    return request<Version>(`/recipes/${recipeId}/merge`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  const rollback = async (
    recipeId: string,
    data: RollbackRequest
  ): Promise<Version> => {
    return request<Version>(`/recipes/${recipeId}/rollback`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  return {
    user,
    login,
    register,
    logout,
    getRecipes,
    getRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    getVersions,
    getVersion,
    getDiff,
    createBranch,
    mergeBranch,
    rollback
  };
}
