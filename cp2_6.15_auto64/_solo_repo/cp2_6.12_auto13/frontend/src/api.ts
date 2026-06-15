import axios from 'axios'
import type { Work, Comment, StatsData, ApiResponse } from './types'

const request = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
})

request.interceptors.response.use(
  (response) => {
    const res: ApiResponse<any> = response.data
    if (res.code === 200) {
      return res.data
    }
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    return Promise.reject(error)
  }
)

export const getWorks = (): Promise<Work[]> => {
  return request.get('/works')
}

export const getWork = (id: number): Promise<Work> => {
  return request.get(`/works/${id}`)
}

export const createWork = (data: Omit<Work, 'id' | 'createdAt' | 'viewCount'>): Promise<Work> => {
  return request.post('/works', data)
}

export const updateWork = (id: number, data: Partial<Work>): Promise<Work> => {
  return request.put(`/works/${id}`, data)
}

export const deleteWork = (id: number): Promise<void> => {
  return request.delete(`/works/${id}`)
}

export const getComments = (workId: number): Promise<Comment[]> => {
  return request.get(`/works/${workId}/comments`)
}

export const createComment = (workId: number, data: Omit<Comment, 'id' | 'workId' | 'createdAt'>): Promise<Comment> => {
  return request.post(`/works/${workId}/comments`, data)
}

export const getStats = (): Promise<StatsData> => {
  return request.get('/stats')
}

export const recordVisit = (): Promise<void> => {
  return request.post('/stats/visit')
}
