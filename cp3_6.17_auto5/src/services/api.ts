import type { Course, KnowledgePoint, Relation, User, AssessmentRecord } from '../types'

const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  getCourses: () => request<Course[]>('/courses'),
  getCourse: (id: string) => request<Course>(`/courses/${id}`),
  createCourse: (data: Partial<Course>) =>
    request<Course>('/courses', { method: 'POST', body: JSON.stringify(data) }),

  getKnowledgePoints: (courseId: string) =>
    request<KnowledgePoint[]>(`/courses/${courseId}/knowledge-points`),
  createKnowledgePoint: (data: Partial<KnowledgePoint>) =>
    request<KnowledgePoint>('/knowledge-points', { method: 'POST', body: JSON.stringify(data) }),
  updateKnowledgePoint: (id: string, data: Partial<KnowledgePoint>) =>
    request<KnowledgePoint>(`/knowledge-points/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteKnowledgePoint: (id: string) =>
    request<{ success: boolean }>(`/knowledge-points/${id}`, { method: 'DELETE' }),

  getRelations: (courseId: string) => request<Relation[]>(`/courses/${courseId}/relations`),
  createRelation: (data: Partial<Relation>) =>
    request<Relation>('/relations', { method: 'POST', body: JSON.stringify(data) }),
  deleteRelation: (id: string) =>
    request<{ success: boolean }>(`/relations/${id}`, { method: 'DELETE' }),

  getUsers: () => request<User[]>('/users'),
  getUser: (id: string) => request<User>(`/users/${id}`),
  getAssessments: (userId: string) =>
    request<Record<string, AssessmentRecord>>(`/users/${userId}/assessments`),
  updateAssessment: (userId: string, kpId: string, data: Partial<AssessmentRecord>) =>
    request<AssessmentRecord>(`/users/${userId}/assessments/${kpId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  getRecommendPath: (userId: string, courseId: string) =>
    request<string[]>(`/users/${userId}/recommend-path?courseId=${courseId}`)
}
