import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from 'axios';
import type { SkillNode, LearningPath, DependencyValidationResult } from '../types';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

const shouldRetry = (error: AxiosError): boolean => {
  if (!error.response) return true;
  const status = error.response.status;
  return status >= 500 || status === 408 || status === 429;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const retryCount = config.headers?.['X-Retry-Count'] as number | undefined;
    if (retryCount === undefined) {
      config.headers.set('X-Retry-Count', '0');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { __retryCount?: number };
    if (!config) return Promise.reject(error);

    const retryCount = parseInt(config.headers?.['X-Retry-Count'] as string || '0', 10);

    if (retryCount < MAX_RETRIES && shouldRetry(error)) {
      config.headers.set('X-Retry-Count', String(retryCount + 1));
      console.warn(
        `[HTTP Retry] ${config.method?.toUpperCase()} ${config.url} attempt ${retryCount + 1}/${MAX_RETRIES}`
      );
      await delay(RETRY_DELAY_MS * (retryCount + 1));
      return http(config);
    }

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
  validateDependency: (nodeId: string, prerequisiteId: string) =>
    http.post<DependencyValidationResult>('/skills/validate-dependency', { nodeId, prerequisiteId }).then(r => r.data),
  reset: () => http.post<{ reset: boolean }>('/skills/reset').then(r => r.data),
  getPath: () => http.get<LearningPath>('/skills/path').then(r => r.data),
};

export default http;
