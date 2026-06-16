import {
  Recipe,
  RecipeVersion,
  VersionDiff,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  CreateBranchRequest,
  MergeBranchRequest,
  RecipeCard,
} from '../types';

const BASE_URL = 'http://localhost:3001';

interface ApiError {
  message: string;
  status: number;
}

const getToken = (): string | null => {
  return localStorage.getItem('authToken');
};

const setToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

const removeToken = (): void => {
  localStorage.removeItem('authToken');
};

const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    if (headers instanceof Headers) {
      headers.set('Authorization', `Bearer ${token}`);
    } else if (Array.isArray(headers)) {
      headers.push(['Authorization', `Bearer ${token}`]);
    } else {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '请求失败' }));
    throw {
      message: errorData.message || '请求失败',
      status: response.status,
    } as ApiError;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

export const useApi = () => {
  const login = async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(response.token);
    return response;
  };

  const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(response.token);
    return response;
  };

  const logout = (): void => {
    removeToken();
  };

  const getRecipes = async (): Promise<Recipe[]> => {
    return request<Recipe[]>('/recipes', {
      method: 'GET',
    });
  };

  const getRecipe = async (id: string): Promise<Recipe> => {
    return request<Recipe>(`/recipes/${id}`, {
      method: 'GET',
    });
  };

  const createRecipe = async (data: CreateRecipeRequest): Promise<Recipe> => {
    return request<Recipe>('/recipes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  const updateRecipe = async (
    id: string,
    data: UpdateRecipeRequest
  ): Promise<Recipe> => {
    return request<Recipe>(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  const deleteRecipe = async (id: string): Promise<void> => {
    return request<void>(`/recipes/${id}`, {
      method: 'DELETE',
    });
  };

  const getVersions = async (recipeId: string): Promise<RecipeVersion[]> => {
    return request<RecipeVersion[]>(`/recipes/${recipeId}/versions`, {
      method: 'GET',
    });
  };

  const getVersion = async (
    recipeId: string,
    versionId: string
  ): Promise<RecipeVersion> => {
    return request<RecipeVersion>(`/recipes/${recipeId}/versions/${versionId}`, {
      method: 'GET',
    });
  };

  const createBranch = async (
    recipeId: string,
    data: CreateBranchRequest
  ): Promise<RecipeVersion> => {
    return request<RecipeVersion>(`/recipes/${recipeId}/branches`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  const mergeBranch = async (
    recipeId: string,
    data: MergeBranchRequest
  ): Promise<RecipeVersion> => {
    return request<RecipeVersion>(`/recipes/${recipeId}/merge`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  const getDiff = async (
    recipeId: string,
    version1Id: string,
    version2Id: string
  ): Promise<VersionDiff> => {
    return request<VersionDiff>(
      `/recipes/${recipeId}/diff?version1=${version1Id}&version2=${version2Id}`,
      {
        method: 'GET',
      }
    );
  };

  const generateRecipeCard = async (
    recipeId: string,
    versionId: string
  ): Promise<RecipeCard> => {
    return request<RecipeCard>(
      `/recipes/${recipeId}/versions/${versionId}/card`,
      {
        method: 'POST',
      }
    );
  };

  return {
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
    createBranch,
    mergeBranch,
    getDiff,
    generateRecipeCard,
  };
};

export default useApi;
