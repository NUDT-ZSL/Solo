export interface Comment {
  id: string
  username: string
  avatar: string
  content: string
  createdAt: string
}

export interface Artwork {
  id: string
  title: string
  author: string
  year: number
  size: string
  material: string
  description: string
  image: string
  thumbnail: string
  likes: number
  liked: boolean
  createdAt: string
  comments?: Comment[]
  commentCount?: number
}

export interface ArtworkListResponse {
  data: Artwork[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

export interface LikeResponse {
  liked: boolean
  likes: number
}

export interface UploadArtworkData {
  title: string
  author: string
  year: string
  size: string
  material: string
  description: string
  image: string
}
