import { Course, KnowledgePoint, Relation, User, Assessment } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });
  
  if (!res.ok) {
    if (res.status === 204) return undefined as unknown as T;
    throw new Error(`Request failed: ${res.status}`);
  }
  
  if (res.status === 204) return undefined as unknown as T;
  
  return res.json();
}

export const courseApi = {
  getAll: () => request<Course[]>('/courses'),
  getOne: (id: string) => request<Course>(`/courses/${id}`),
  create: (data: Partial<Course>) => request<Course>('/courses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Course>) => request<Course>(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/courses/${id}`, { method: 'DELETE' })
};

export const pointApi = {
  getByCourse: (courseId: string) => request<KnowledgePoint[]>(`/courses/${courseId}/points`),
  create: (courseId: string, data: Partial<KnowledgePoint>) =>
    request<KnowledgePoint>(`/courses/${courseId}/points`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<KnowledgePoint>) =>
    request<KnowledgePoint>(`/points/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/points/${id}`, { method: 'DELETE' })
};

export const relationApi = {
  getByCourse: (courseId: string) => request<Relation[]>(`/courses/${courseId}/relations`),
  create: (courseId: string, data: Partial<Relation>) =>
    request<Relation>(`/courses/${courseId}/relations`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Relation>) =>
    request<Relation>(`/relations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/relations/${id}`, { method: 'DELETE' })
};

export const userApi = {
  getAll: () => request<User[]>('/users'),
  getOne: (id: string) => request<User>(`/users/${id}`),
  create: (data: Partial<User>) => request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<User>) => request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' })
};

export const assessmentApi = {
  get: (userId: string, courseId: string) =>
    request<Assessment | null>(`/users/${userId}/assessments/${courseId}`),
  save: (userId: string, courseId: string, scores: { pointId: string; score: number }[]) =>
    request<Assessment>(`/users/${userId}/assessments/${courseId}`, {
      method: 'POST',
      body: JSON.stringify({ scores })
    })
};

export const recommendApi = {
  getPath: (courseId: string, userId: string, maxNodes: number = 5) =>
    request<string[]>('/recommend-path', {
      method: 'POST',
      body: JSON.stringify({ courseId, userId, maxNodes })
    })
};
