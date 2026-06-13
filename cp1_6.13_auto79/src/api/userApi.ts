import axios from 'axios'
import type { PublicUser } from '../../server/models/userStore'

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

export interface RegisterData {
  username: string
  email: string
  password: string
  preference_tags: string[]
}

export interface LoginData {
  email: string
  password: string
}

export const registerUser = async (data: RegisterData): Promise<PublicUser> => {
  const response = await api.post<PublicUser>('/users/register', data)
  if (response.data.auth_token) {
    localStorage.setItem('recipeRadarToken', response.data.auth_token)
    localStorage.setItem('recipeRadarUserId', response.data._id)
    localStorage.setItem('recipeRadarUser', JSON.stringify(response.data))
  }
  return response.data
}

export const loginUser = async (data: LoginData): Promise<PublicUser> => {
  const response = await api.post<PublicUser>('/users/login', data)
  if (response.data.auth_token) {
    localStorage.setItem('recipeRadarToken', response.data.auth_token)
    localStorage.setItem('recipeRadarUserId', response.data._id)
    localStorage.setItem('recipeRadarUser', JSON.stringify(response.data))
  }
  return response.data
}

export const getUserPreferences = async (userId: string): Promise<string[]> => {
  const { data } = await api.get<{ preference_tags: string[] }>(`/users/${userId}/preferences`)
  return data.preference_tags
}

export const updateUserPreferences = async (userId: string, preference_tags: string[]): Promise<boolean> => {
  const { data } = await api.put<{ success: boolean }>(`/users/${userId}/preferences`, { preference_tags })
  return data.success
}

export const getCurrentUser = async (): Promise<PublicUser> => {
  const { data } = await api.get<PublicUser>('/users/me')
  localStorage.setItem('recipeRadarUser', JSON.stringify(data))
  return data
}

export const addUserHistory = async (
  userId: string,
  recipe_id: string,
  action: 'view' | 'like' | 'upload'
): Promise<boolean> => {
  const { data } = await api.post<{ success: boolean }>(`/users/${userId}/history`, {
    recipe_id,
    action
  })
  return data.success
}

export const logoutUser = (): void => {
  localStorage.removeItem('recipeRadarToken')
  localStorage.removeItem('recipeRadarUserId')
  localStorage.removeItem('recipeRadarUser')
}

export const getStoredUserId = (): string | null => {
  return localStorage.getItem('recipeRadarUserId')
}

export const getStoredToken = (): string | null => {
  return localStorage.getItem('recipeRadarToken')
}

export const storeUserInfo = (user: PublicUser): void => {
  localStorage.setItem('recipeRadarUser', JSON.stringify(user))
}

export const getStoredUser = (): PublicUser | null => {
  const raw = localStorage.getItem('recipeRadarUser')
  if (!raw) return null
  try {
    return JSON.parse(raw) as PublicUser
  } catch {
    return null
  }
}

export default {
  registerUser,
  loginUser,
  getUserPreferences,
  updateUserPreferences,
  getCurrentUser,
  addUserHistory,
  logoutUser,
  getStoredUserId,
  getStoredToken,
  storeUserInfo,
  getStoredUser
}
