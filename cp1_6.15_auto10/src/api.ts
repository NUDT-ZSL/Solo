import { Movie, RankedMovie, ApiResponse, MovieFilters } from './types'

const BASE_URL = 'http://localhost:3002/api'
const TIMEOUT = 5000

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    const result: ApiResponse<T> = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.message || '请求失败')
    }

    return result.data
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error('请求超时，请稍后重试')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchMovies(filters: MovieFilters): Promise<Movie[]> {
  const params = new URLSearchParams()
  if (filters.year !== 'all') {
    params.set('year', String(filters.year))
  }
  if (filters.minScore !== null) {
    params.set('minScore', String(filters.minScore))
  }
  if (filters.maxScore !== null) {
    params.set('maxScore', String(filters.maxScore))
  }
  const queryString = params.toString()
  return request<Movie[]>(`/movies${queryString ? `?${queryString}` : ''}`)
}

export async function fetchMovie(id: string): Promise<Movie> {
  return request<Movie>(`/movies/${id}`)
}

export async function submitScore(id: string, score: number): Promise<Movie> {
  return request<Movie>(`/movies/${id}/score`, {
    method: 'POST',
    body: JSON.stringify({ score })
  })
}

export async function fetchRanking(): Promise<RankedMovie[]> {
  return request<RankedMovie[]>('/ranking')
}

export async function fetchYears(): Promise<number[]> {
  return request<number[]>('/years')
}
