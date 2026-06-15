import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export interface Member {
  id: string;
  name: string;
  pinyin: string;
  instrument: string;
}

export interface Assignment {
  memberId: string;
  part: string;
  status: 'confirmed' | 'pending' | 'adjust_request' | 'leave';
  adjustNote?: string;
  requestedPart?: string;
}

export interface Track {
  id: string;
  title: string;
  key: string;
  difficulty: 'easy' | 'medium' | 'hard';
  defaultParts: string[];
  assignments: Assignment[];
}

export interface Project {
  id: string;
  title: string;
  date: string;
  venue: string;
  tracks: Track[];
  schedule: ScheduleSlot[];
  createdAt: string;
  recent?: string;
}

export interface ScheduleSlot {
  id: string;
  dayIndex: number;
  timeSlot: number;
  memberId: string;
  part: string;
  projectId: string;
}

export interface Feedback {
  id: string;
  projectId: string;
  memberId: string;
  rating: number;
  note: string;
  part: string;
  createdAt: string;
  memberName?: string;
}

export interface AdjustRequest {
  id: string;
  projectId: string;
  trackId: string;
  memberId: string;
  currentPart: string;
  requestedPart: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  memberName?: string;
  projectTitle?: string;
  trackTitle?: string;
}

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
}

export const projectApi = {
  getAll: () => api.get<Project[]>('/projects'),
  getById: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data),
};

export const memberApi = {
  getAll: () => api.get<Member[]>('/members'),
  create: (data: Partial<Member>) => api.post<Member>('/members', data),
};

export const assignmentApi = {
  update: (projectId: string, trackId: string, memberId: string, data: Partial<Assignment>) =>
    api.put(`/projects/${projectId}/tracks/${trackId}/assignments/${memberId}`, data),
};

export const adjustRequestApi = {
  getAll: () => api.get<AdjustRequest[]>('/adjust-requests'),
  update: (id: string, status: 'approved' | 'rejected') =>
    api.put(`/adjust-requests/${id}`, { status }),
};

export const scheduleApi = {
  get: (projectId: string) => api.get<ScheduleSlot[]>(`/schedule/${projectId}`),
  update: (projectId: string, schedule: ScheduleSlot[]) =>
    api.post(`/schedule/${projectId}`, schedule),
};

export const feedbackApi = {
  getByProject: (projectId: string) => api.get<Feedback[]>(`/feedbacks/${projectId}`),
  create: (data: Partial<Feedback>) => api.post<Feedback>('/feedbacks', data),
};

export const searchApi = {
  query: (q: string) => api.get<SearchResult[]>('/search', { params: { q } }),
};
