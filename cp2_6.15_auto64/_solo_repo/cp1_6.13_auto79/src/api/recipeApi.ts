import axios from 'axios'
import type { Recipe } from '../../server/models/recipeStore'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('recipeRadarToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface CreateRecipeData {
  title: string
  cover_image: string
  category: string
  ingredients: string[]
  steps_html: string
  cook_time_minutes: number
  author_id: string
  author_name: string
}

export interface RecommendResponse {
  preference_tags: string[]
  history: Array<{ recipe_id: string; action: string; timestamp: number }>
  liked_recipes: string[]
  uploaded_recipes: string[]
  recipes: Recipe[]
}

export const fetchRecipes = async (limit?: number): Promise<Recipe[]> => {
  const params = limit ? { limit } : {}
  const { data } = await api.get<Recipe[]>('/recipes', { params })
  return data
}

export const fetchLatestRecipes = async (limit: number = 20): Promise<Recipe[]> => {
  const { data } = await api.get<Recipe[]>('/recipes/latest', { params: { limit } })
  return data
}

export const fetchRecipeById = async (id: string): Promise<Recipe> => {
  const { data } = await api.get<Recipe>(`/recipes/${id}`)
  return data
}

export const createRecipe = async (recipe: CreateRecipeData): Promise<Recipe> => {
  const { data } = await api.post<Recipe>('/recipes', recipe)
  return data
}

export const searchRecipes = async (query: string, limit?: number): Promise<Recipe[]> => {
  const params: { query: string; limit?: number } = { query }
  if (limit) params.limit = limit
  const { data } = await api.get<Recipe[]>('/recipes/search', { params })
  return data
}

export const likeRecipe = async (id: string): Promise<Recipe> => {
  const { data } = await api.post<Recipe>(`/recipes/${id}/like`)
  return data
}

export const fetchRecommendData = async (userId: string): Promise<RecommendResponse> => {
  const { data } = await api.get<RecommendResponse>(`/recipes/recommend/${userId}`)
  return data
}

export default {
  fetchRecipes,
  fetchLatestRecipes,
  fetchRecipeById,
  createRecipe,
  searchRecipes,
  likeRecipe,
  fetchRecommendData
}
