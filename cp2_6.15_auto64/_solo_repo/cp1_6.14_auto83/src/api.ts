import axios from 'axios'
import type { Artwork, ArtworkListResponse, Comment, LikeResponse, UploadArtworkData } from './types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

export const getArtworks = async (page = 1, limit = 12): Promise<ArtworkListResponse> => {
  const res = await api.get('/artworks', { params: { page, limit } })
  return res.data
}

export const getArtworkDetail = async (id: string): Promise<Artwork> => {
  const res = await api.get(`/artworks/${id}`)
  return res.data
}

export const uploadArtwork = async (
  data: UploadArtworkData,
  onProgress?: (progress: number) => void
): Promise<Artwork> => {
  const res = await api.post('/artworks', data, {
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percent)
      }
    }
  })
  return res.data
}

export const addComment = async (id: string, username: string, content: string): Promise<Comment> => {
  const res = await api.post(`/artworks/${id}/comments`, { username, content })
  return res.data
}

export const toggleLike = async (id: string): Promise<LikeResponse> => {
  const res = await api.post(`/artworks/${id}/like`)
  return res.data
}

export default api
