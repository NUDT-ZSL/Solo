import axios from 'axios'
import { HarmonyRule } from '../utils/colorHarmony'

export interface ColorScheme {
  _id?: string
  name: string
  ruleType: HarmonyRule
  colors: string[]
  createdAt: number
}

const api = axios.create({
  baseURL: '/api',
  timeout: 5000
})

let saveTimer: ReturnType<typeof setTimeout> | null = null

export const saveColorScheme = async (scheme: Omit<ColorScheme, '_id' | 'createdAt'>): Promise<ColorScheme> => {
  if (saveTimer) clearTimeout(saveTimer)

  return new Promise((resolve, reject) => {
    saveTimer = setTimeout(async () => {
      try {
        const res = await api.post<{ success: boolean; data: ColorScheme }>('/color-schemes', {
          ...scheme,
          createdAt: Date.now()
        })
        if (res.data.success) {
          resolve(res.data.data)
        } else {
          reject(new Error('保存失败'))
        }
      } catch (error) {
        reject(error)
      }
    }, 300)
  })
}

export const getHistory = async (limit: number = 20): Promise<ColorScheme[]> => {
  const res = await api.get<{ success: boolean; data: ColorScheme[] }>('/history', {
    params: { limit }
  })
  if (res.data.success) {
    return res.data.data
  }
  throw new Error('获取历史失败')
}

export const deleteColorScheme = async (id: string): Promise<void> => {
  const res = await api.delete(`/color-schemes/${id}`)
  if (!res.data.success) {
    throw new Error('删除失败')
  }
}
