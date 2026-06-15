export interface Movie {
  id: string
  title: string
  year: number
  poster: string
  synopsis: string
  cast: string[]
  director: string
  genre: string[]
  duration: number
  averageScore: number
  voteCount: number
}

export interface RankedMovie extends Movie {
  rank: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

export interface MovieFilters {
  year: number | 'all'
  minScore: number | null
  maxScore: number | null
}
