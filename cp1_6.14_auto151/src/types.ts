export interface Artist {
  id: string
  name: string
  bio: string
  avatar: string
  createdAt: string
  stats?: {
    totalWorks: number
    totalFavorites: number
    totalSales: number
    totalRevenue: number
  }
}

export interface Artwork {
  id: string
  title: string
  artistId: string
  description: string
  category: string
  year: number
  price: number
  image: string
  favorites: number
  sold: boolean
  createdAt: string
}

export interface Purchase {
  id: string
  artworkId: string
  buyerId: string
  artistId: string
  price: number
  purchasedAt: string
}

export type PageView = 'gallery' | 'artist' | 'collector' | 'artwork-detail' | 'register'

export interface User {
  id: string
  name: string
  type: 'artist' | 'collector'
  avatar: string
}
