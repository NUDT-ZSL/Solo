import axios from 'axios'
import { Outfit, SaveOutfitRequest, ApiResponse, SelectedClothing } from '@/types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

const mapDbToOutfit = (dbOutfit: any): Outfit => ({
  id: dbOutfit.id,
  name: dbOutfit.name,
  createdAt: dbOutfit.created_at,
  top: { styleId: dbOutfit.top_style, color: dbOutfit.top_color },
  bottom: { styleId: dbOutfit.bottom_style, color: dbOutfit.bottom_color },
  shoes: { styleId: dbOutfit.shoes_style, color: dbOutfit.shoes_color },
  accessory: dbOutfit.accessory_style
    ? { styleId: dbOutfit.accessory_style, color: dbOutfit.accessory_color }
    : null,
  thumbnail: dbOutfit.thumbnail || '',
  likes: dbOutfit.likes || 0
})

const mapOutfitToDb = (outfit: SaveOutfitRequest) => ({
  name: outfit.name,
  top_style: outfit.top.styleId,
  top_color: outfit.top.color,
  bottom_style: outfit.bottom.styleId,
  bottom_color: outfit.bottom.color,
  shoes_style: outfit.shoes.styleId,
  shoes_color: outfit.shoes.color,
  accessory_style: outfit.accessory?.styleId || null,
  accessory_color: outfit.accessory?.color || null,
  thumbnail: outfit.thumbnail
})

export const saveOutfit = async (
  outfit: SaveOutfitRequest
): Promise<ApiResponse<Outfit>> => {
  try {
    const response = await api.post('/outfits', mapOutfitToDb(outfit))
    return {
      success: true,
      data: mapDbToOutfit(response.data.data)
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

export const getOutfits = async (): Promise<ApiResponse<Outfit[]>> => {
  try {
    const response = await api.get('/outfits')
    return {
      success: true,
      data: response.data.data.map(mapDbToOutfit)
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

export const getOutfitById = async (
  id: string
): Promise<ApiResponse<Outfit>> => {
  try {
    const response = await api.get(`/outfits/${id}`)
    return {
      success: true,
      data: mapDbToOutfit(response.data.data)
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

export const likeOutfit = async (
  id: string,
  userId: string
): Promise<ApiResponse<{ likes: number; isLiked: boolean }>> => {
  try {
    const response = await api.post(`/outfits/${id}/like`, { userId })
    return {
      success: true,
      data: response.data.data
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

export const getLikedOutfits = async (
  userId: string
): Promise<ApiResponse<Outfit[]>> => {
  try {
    const response = await api.get(`/likes/${userId}`)
    return {
      success: true,
      data: response.data.data.map(mapDbToOutfit)
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

export const generateShareLink = (outfitId: string): string => {
  return `${window.location.origin}/share/${outfitId}`
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const generateThumbnail = (
  top: SelectedClothing | null,
  bottom: SelectedClothing | null,
  shoes: SelectedClothing | null,
  accessory: SelectedClothing | null
): string => {
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 300
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = '#f0ece3'
  ctx.fillRect(0, 0, 200, 300)

  if (top?.color) {
    ctx.fillStyle = top.color
    ctx.beginPath()
    ctx.roundRect(50, 60, 100, 120, 8)
    ctx.fill()
  }

  if (bottom?.color) {
    ctx.fillStyle = bottom.color
    ctx.beginPath()
    ctx.roundRect(55, 180, 90, 90, 8)
    ctx.fill()
  }

  if (shoes?.color) {
    ctx.fillStyle = shoes.color
    ctx.beginPath()
    ctx.roundRect(55, 270, 35, 20, 4)
    ctx.roundRect(110, 270, 35, 20, 4)
    ctx.fill()
  }

  if (accessory?.color) {
    ctx.fillStyle = accessory.color
    ctx.beginPath()
    ctx.arc(100, 35, 20, 0, Math.PI * 2)
    ctx.fill()
  }

  return canvas.toDataURL('image/png')
}
