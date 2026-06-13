import axios from 'axios'
import type { Recipe } from '../../server/models/recipeStore'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
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
  cover: string
  category: string
  ingredients: string[]
  steps: string
  cookTime: number
  authorId: string
  authorName: string
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

export default {
  fetchRecipes,
  fetchLatestRecipes,
  fetchRecipeById,
  createRecipe,
  searchRecipes,
  likeRecipe
}
