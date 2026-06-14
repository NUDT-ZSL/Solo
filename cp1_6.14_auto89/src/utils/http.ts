import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export type MasteryLevel = 'unlearned' | 'learning' | 'mastered';

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  level: MasteryLevel;
  estimatedHours: number;
  parentId: string | null;
  childrenIds: string[];
  prerequisites: string[];
}

export interface LearningStep {
  nodeId: string;
  name: string;
  description: string;
  estimatedHours: number;
  prerequisites: string[];
  prerequisiteNames: string[];
}

export interface LearningPath {
  steps: LearningStep[];
  totalHours: number;
  remainingHours: number;
}

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    console.error('[HTTP Error]', error?.response?.status, error?.message);
    return Promise.reject(error);
  }
);

export const skillsApi = {
  getAll: () => http.get<SkillNode[]>('/skills').then(r => r.data),
  create: (data: Partial<SkillNode>) => http.post<SkillNode>('/skills', data).then(r => r.data),
  update: (id: string, data: Partial<SkillNode>) => http.put<SkillNode>(`/skills/${id}`, data).then(r => r.data),
  remove: (id: string) => http.delete<{ deleted: string[] }>(`/skills/${id}`).then(r => r.data),
  setPrerequisites: (id: string, prerequisites: string[]) =>
    http.put<SkillNode>(`/skills/${id}/prerequisites`, { prerequisites }).then(r => r.data),
  reset: () => http.post<{ reset: boolean }>('/skills/reset').then(r => r.data),
  getPath: () => http.get<LearningPath>('/skills/path').then(r => r.data),
};

export default http;
