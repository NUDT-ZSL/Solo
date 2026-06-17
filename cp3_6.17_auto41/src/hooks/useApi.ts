import { useState, useCallback } from 'react';
import type {
  User,
  Recipe,
  RecipeVersion,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  CreateVersionRequest,
  CreateBranchRequest,
  MergeBranchRequest
} from '../types';

const BASE_URL = '/api';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useApiState<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const startLoading = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }));
  }, []);

  const setSuccess = useCallback((data: T) => {
    setState({ data, loading: false, error: null });
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, loading: false, error }));
  }, []);

  return { state, startLoading, setSuccess, setError };
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export function useLogin() {
  const { state, startLoading, setSuccess, setError } = useApiState<AuthResponse>();

  const login = useCallback(async (data: LoginRequest) => {
    startLoading();
    try {
      const result = await request<AuthResponse>('/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }, [startLoading, setSuccess, setError]);

  return { ...state, login };
}

export function useRegister() {
  const { state, startLoading, setSuccess, setError } = useApiState<AuthResponse>();

  const register = useCallback(async (data: RegisterRequest) => {
    startLoading();
    try {
      const result = await request<AuthResponse>('/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    }
  }, [startLoading, setSuccess, setError]);

  return { ...state, register };
}

export function useGetRecipes() {
  const { state, startLoading, setSuccess, setError } = useApiState<Partial<Recipe>[]>();

  const getRecipes = useCallback(async () => {
    startLoading();
    try {
      const result = await request<Partial<Recipe>[]>('/recipes');
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch recipes';
      setError(message);
      throw err;
    }
  }, [startLoading, setSuccess, setError]);

  return { ...state, getRecipes };
}

export function useGetRecipe() {
  const { state, startLoading, setSuccess, setError } = useApiState<Recipe>();

  const getRecipe = useCallback(async (id: string) => {
    startLoading();
    try {
      const result = await request<Recipe>(`/recipes/${id}`);
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch recipe';
      setError(message);
      throw err;
    }
  }, [startLoading, setSuccess, setError]);

  return { ...state, getRecipe };
}

export function useCreateRecipe() {
  const { state, startLoading, setSuccess, setError } = useApiState<Recipe>();

  const createRecipe = useCallback(async (data: CreateRecipeRequest & { authorId: string; author: string }) => {
    startLoading();
    try {
      const result = await request<Recipe>('/recipes', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create recipe';
      setError(message);
      throw err;
    }
  }, [startLoading, setSuccess, setError]);

  return { ...state, createRecipe };
}

export function useUpdateRecipe() {
  const { state, startLoading, setSuccess, setError } = useApiState<Recipe>();

  const updateRecipe = useCallback(async (id: string, data: UpdateRecipeRequest) => {
    startLoading();
    try {
      const result = await request<Recipe>(`/recipes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update recipe';
      setError(message);
      throw err;
    }
  }, [startLoading, setSuccess, setError]);

  return { ...state, updateRecipe };
}

export function useGetVersions() {
  const { state, startLoading, setSuccess, setError } = useApiState<RecipeVersion[]>();

  const getVersions = useCallback(async (recipeId: string) => {
    startLoading();
    try {
      const result = await request<RecipeVersion[]>(`/recipes/${recipeId}/versions`);
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch versions';
      setError(message);
      throw err;
    }
  }, [startLoading, setSuccess, setError]);

  return { ...state, getVersions };
}

export function useCreateVersion() {
  const { state, startLoading, setSuccess, setError } = useApiState<RecipeVersion>();

  const createVersion = useCallback(async (
    recipeId: string,
    data: CreateVersionRequest & { authorId: string; author: string }
  ) => {
    startLoading();
    try {
      const result = await request<RecipeVersion>(`/recipes/${recipeId}/versions`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create version';
      setError(message);
      throw err;
    }
  }, [startLoading, setSuccess, setError]);

  return { ...state, createVersion };
}

export function useCreateBranch() {
  const { state, startLoading, setSuccess, setError } = useApiState<RecipeVersion>();

  const createBranch = useCallback(async (
    recipeId: string,
    data: CreateBranchRequest & { authorId: string; author: string }
  ) => {
    startLoading();
    try {
      const result = await request<RecipeVersion>(`/recipes/${recipeId}/branch`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create branch';
      setError(message);
      throw err;
    }
  }, [startLoading, setSuccess, setError]);

  return { ...state, createBranch };
}

export function useMergeBranch() {
  const { state, startLoading, setSuccess, setError } = useApiState<RecipeVersion>();

  const mergeBranch = useCallback(async (
    recipeId: string,
    data: MergeBranchRequest & { authorId: string; author: string }
  ) => {
    startLoading();
    try {
      const result = await request<RecipeVersion>(`/recipes/${recipeId}/merge`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to merge branch';
      setError(message);
      throw err;
    }
  }, [startLoading, setSuccess, setError]);

  return { ...state, mergeBranch };
}
