import axios from 'axios'
import type { Recipe } from './types'

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

http.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('请求错误:', error.message)
    return Promise.reject(error)
  }
)

export const getRecipes = (): Promise<Recipe[]> => {
  return http.get('/recipes')
}

export const getRecipeById = (id: string): Promise<Recipe> => {
  return http.get(`/recipes/${id}`)
}

export const createRecipe = (data: Partial<Recipe>): Promise<Recipe> => {
  return http.post('/recipes', data)
}

export default http
