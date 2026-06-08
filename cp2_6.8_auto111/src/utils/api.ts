import axios from 'axios'
import type { RetroType, RetroResponse } from '../types'

const api = axios.create({ baseURL: '/api' })

export const addRetro = (type: RetroType, content: string) =>
  api.post<RetroResponse>('/retro', { type, content })

export const getRetros = () => api.get<RetroResponse>('/retro')

export const deleteRetro = (id: string) =>
  api.delete<RetroResponse>(`/retro/${id}`)
