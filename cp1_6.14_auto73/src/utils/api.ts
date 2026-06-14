import axios from 'axios';
import type { Job, Candidate, CreateJobPayload, UpdateCandidatePayload } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const jobsApi = {
  getAll: () => api.get<Job[]>('/jobs').then((r) => r.data),
  getById: (id: string) => api.get<Job>(`/jobs/${id}`).then((r) => r.data),
  create: (data: CreateJobPayload) => api.post<Job>('/jobs', data).then((r) => r.data),
  update: (id: string, data: Partial<Job>) => api.put<Job>(`/jobs/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/jobs/${id}`).then((r) => r.data),
};

export const candidatesApi = {
  getAll: (jobId?: string) =>
    api.get<Candidate[]>('/candidates', { params: jobId ? { jobId } : {} }).then((r) => r.data),
  getById: (id: string) => api.get<Candidate>(`/candidates/${id}`).then((r) => r.data),
  create: (data: Partial<Candidate>) => api.post<Candidate>('/candidates', data).then((r) => r.data),
  update: (id: string, data: UpdateCandidatePayload) =>
    api.put<Candidate>(`/candidates/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/candidates/${id}`).then((r) => r.data),
  uploadResume: (data: {
    jobId: string;
    name: string;
    phone: string;
    email: string;
    yearsOfExperience: number;
    skills: string[];
    fileName: string;
  }) => api.post<Candidate>('/upload', data).then((r) => r.data),
};

export default api;
