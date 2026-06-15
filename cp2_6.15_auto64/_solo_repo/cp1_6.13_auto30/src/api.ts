import type { Book, Review, Stats, BookInput } from './types'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(err.error || '请求失败')
  }
  return res.json()
}

export function getBooks(keyword?: string, category?: string): Promise<Book[]> {
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  if (category) params.set('category', category)
  const query = params.toString() ? `?${params.toString()}` : ''
  return request<Book[]>(`/books${query}`)
}

export function getBookById(id: string): Promise<Book> {
  return request<Book>(`/books/${id}`)
}

export function getBookReviews(bookId: string): Promise<Review[]> {
  return request<Review[]>(`/books/${bookId}/reviews`)
}

export function addBook(book: BookInput): Promise<Book> {
  return request<Book>('/books', {
    method: 'POST',
    body: JSON.stringify(book),
  })
}

export function addReview(bookId: string, rating: number, comment: string): Promise<Review> {
  return request<Review>('/reviews', {
    method: 'POST',
    body: JSON.stringify({ bookId, rating, comment }),
  })
}

export function borrowBook(bookId: string): Promise<{ success: boolean; book: Book }> {
  return request<{ success: boolean; book: Book }>('/borrow', {
    method: 'POST',
    body: JSON.stringify({ bookId }),
  })
}

export function returnBook(bookId: string): Promise<{ success: boolean; book: Book }> {
  return request<{ success: boolean; book: Book }>('/return', {
    method: 'POST',
    body: JSON.stringify({ bookId }),
  })
}

export function getStats(): Promise<Stats> {
  return request<Stats>('/stats')
}
