import axios from 'axios'
import type { Recipe, Comment, MatchedRecipe, Ingredient } from './types'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

request.interceptors.request.use(
  (config) => {
    console.log(`[Request] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('[Request Error]', error)
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败'
    console.error('[Response Error]', message)
    return Promise.reject(new Error(message))
  }
)

export const getRecipes = (page: number = 1, limit: number = 10) => {
  return request.get<unknown, Recipe[]>('/recipes', { params: { page, limit } })
}

export const getRecipe = (id: string) => {
  return request.get<unknown, Recipe>(`/recipes/${id}`)
}

export const createRecipe = (data: Partial<Recipe>) => {
  return request.post<unknown, Recipe>('/recipes', data)
}

export const updateRecipe = (id: string, data: Partial<Recipe>) => {
  return request.put<unknown, Recipe>(`/recipes/${id}`, data)
}

export const deleteRecipe = (id: string) => {
  return request.delete<unknown, void>(`/recipes/${id}`)
}

export const rateRecipe = (id: string, rating: number) => {
  return request.post<unknown, Recipe>(`/recipes/${id}/rate`, { rating })
}

export const getComments = (recipeId: string) => {
  return request.get<unknown, Comment[]>(`/recipes/${recipeId}/comments`)
}

export const createComment = (recipeId: string, content: string) => {
  return request.post<unknown, Comment>(`/recipes/${recipeId}/comments`, { content })
}

export const reactComment = (commentId: string, type: 'like' | 'dislike') => {
  return request.post<unknown, Comment>(`/comments/${commentId}/react`, { type })
}

export const searchIngredients = (q: string) => {
  return request.get<unknown, Ingredient[]>('/ingredients/search', { params: { q } })
}

export const matchRecipes = (ingredients: string[]) => {
  return request.post<unknown, MatchedRecipe[]>('/recipes/match', { ingredients })
}

export const getUserRecipes = () => {
  return request.get<unknown, Recipe[]>('/user/recipes')
}

export const getUserFavorites = () => {
  return request.get<unknown, Recipe[]>('/user/favorites')
}

export const toggleFavorite = (recipeId: string) => {
  return request.post<unknown, { favorited: boolean }>(`/recipes/${recipeId}/favorite`)
}

export const uploadImage = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<unknown, { url: string }>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
