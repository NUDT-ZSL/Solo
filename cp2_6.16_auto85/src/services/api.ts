import { request } from '../config/api'

export interface Ingredient {
  id: string
  name: string
  quantity: string
  unit: string
}

export interface Step {
  id: string
  text: string
  image?: string
}

export interface Recipe {
  id: string
  name: string
  description: string
  cookTime: number
  cuisine: 'chinese' | 'western' | 'japanese' | 'fusion'
  ingredients: Ingredient[]
  steps: Step[]
  createdAt: string
  updatedAt: string
}

export interface Version {
  id: string
  recipeId: string
  timestamp: string
  summary: string
  snapshot: Recipe
  restoredFrom?: string
}

export function getRecipes(): Promise<Recipe[]> {
  return request<Recipe[]>('/recipes')
}

export function getRecipe(id: string): Promise<Recipe> {
  return request<Recipe>(`/recipes/${id}`)
}

export function createRecipe(
  data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Recipe> {
  return request<Recipe>('/recipes', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export function updateRecipe(
  id: string,
  data: Partial<Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Recipe> {
  return request<Recipe>(`/recipes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export function deleteRecipe(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/recipes/${id}`, {
    method: 'DELETE'
  })
}

export function getVersions(recipeId: string): Promise<Version[]> {
  return request<Version[]>(`/versions/${recipeId}`)
}

export function restoreVersion(
  recipeId: string,
  versionId: string
): Promise<{ recipe: Recipe; version: Version }> {
  return request<{ recipe: Recipe; version: Version }>(
    `/versions/${recipeId}/restore/${versionId}`,
    {
      method: 'POST'
    }
  )
}
