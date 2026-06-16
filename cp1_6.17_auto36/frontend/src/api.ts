import type { Card, Project, Vote, RiskAlert, TeamMember, ProgressStats, WorkloadItem, CardStatus } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export const api = {
  getProjects: () => request<Project[]>('/projects'),
  
  createProject: (name: string, description: string) => 
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    }),
  
  getCards: (projectId?: string) => 
    request<Card[]>(`/cards${projectId ? `?projectId=${projectId}` : ''}`),
  
  getCard: (id: string) => request<Card>(`/cards/${id}`),
  
  createCard: (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'lastStatusChange' | 'status'>) =>
    request<Card>('/cards', {
      method: 'POST',
      body: JSON.stringify({ ...card, status: 'discussion' })
    }),
  
  updateCard: (id: string, updates: Partial<Card>) =>
    request<Card>(`/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
  
  updateCardStatus: (id: string, status: CardStatus) =>
    request<Card>(`/cards/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  
  getVotes: (cardId?: string) =>
    request<Vote[]>(`/votes${cardId ? `?cardId=${cardId}` : ''}`),
  
  submitVote: (cardId: string, userId: string, score: number) =>
    request<Vote>('/vote', {
      method: 'POST',
      body: JSON.stringify({ cardId, userId, score })
    }),
  
  getTeamMembers: () => request<TeamMember[]>('/team-members'),
  
  getRisks: (projectId?: string) =>
    request<RiskAlert[]>(`/risks${projectId ? `?projectId=${projectId}` : ''}`),
  
  acknowledgeRisk: (cardId: string) =>
    request<{ success: boolean }>(`/risks/${cardId}/acknowledge`, {
      method: 'POST'
    }),
  
  getProgressStats: (projectId?: string) =>
    request<ProgressStats>(`/stats/progress${projectId ? `?projectId=${projectId}` : ''}`),
  
  getWorkload: (projectId?: string) =>
    request<WorkloadItem[]>(`/stats/workload${projectId ? `?projectId=${projectId}` : ''}`),
  
  sendEmail: (to: string, subject: string, body: string) =>
    request<{ success: boolean; message: string }>('/notifications/email', {
      method: 'POST',
      body: JSON.stringify({ to, subject, body })
    })
};
