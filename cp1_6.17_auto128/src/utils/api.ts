export type FeedbackType = 'feature' | 'bug' | 'performance'
export type FeedbackStatus = 'pending' | 'processing' | 'closed'
export type Sentiment = 'positive' | 'neutral' | 'negative'

export interface Feedback {
  id: string
  type: FeedbackType
  title: string
  description: string
  status: FeedbackStatus
  sentiment: Sentiment
  keywords: string[]
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface CreateFeedbackDto {
  type: FeedbackType
  title: string
  description: string
}

const BASE_URL = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  if (res.status === 204) return null as unknown as T
  return res.json()
}

export const api = {
  getFeedbacks: () => request<Feedback[]>('/feedbacks'),

  createFeedback: (data: CreateFeedbackDto) =>
    request<Feedback>('/feedbacks', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateFeedback: (id: string, data: Partial<Feedback>) =>
    request<Feedback>(`/feedbacks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteFeedback: (id: string) =>
    request<void>(`/feedbacks/${id}`, {
      method: 'DELETE'
    }),

  analyzeText: (text: string) =>
    request<{ sentiment: Sentiment; keywords: string[] }>('/analyze', {
      method: 'POST',
      body: JSON.stringify({ text })
    })
}
