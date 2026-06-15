import axios from 'axios'
import type { Project, Paragraph, StageConfirmation } from './types'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

export interface CreateProjectData {
  name: string
  genres: string[]
  description: string
  leaderName: string
  leaderAvatar?: string
}

export interface JoinProjectData {
  inviteCode: string
  memberName: string
  memberAvatar?: string
}

export const projectAPI = {
  create: (data: CreateProjectData) => api.post<Project>('/projects', data).then(r => r.data),
  list: () => api.get<Project[]>('/projects').then(r => r.data),
  get: (id: string) => api.get<Project>(`/projects/${id}`).then(r => r.data),
  join: (id: string, data: JoinProjectData) =>
    api.post<{ member: any; project: Project }>(`/projects/${id}/join`, data).then(r => r.data),
  confirm: (id: string, data: { stageIndex: number; memberId: string }) =>
    api.post<StageConfirmation>(`/projects/${id}/confirm`, data).then(r => r.data),
  getConfirmations: (id: string) =>
    api.get<StageConfirmation[]>(`/projects/${id}/confirmations`).then(r => r.data),
  export: (id: string) => api.post<any>(`/projects/${id}/export`).then(r => r.data),
}

export const paragraphAPI = {
  list: (projectId: string) =>
    api.get<Paragraph[]>(`/projects/${projectId}/paragraphs`).then(r => r.data),
  save: (projectId: string, paragraphs: Paragraph[]) =>
    api.post<Paragraph[]>(`/projects/${projectId}/paragraphs`, { paragraphs }).then(r => r.data),
}
