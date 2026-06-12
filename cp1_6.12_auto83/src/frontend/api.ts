import axios from 'axios';
import type { Goal, Task, Member } from './types.js';

const api = axios.create({ baseURL: '/api' });

export const goalApi = {
  create: (data: { title: string; description?: string; createdBy: string; userName: string }) =>
    api.post<Goal>('/goals', data).then((r) => r.data),
  list: () => api.get<Goal[]>('/goals').then((r) => r.data),
  get: (id: string) => api.get<Goal>(`/goals/${id}`).then((r) => r.data),
  byInvite: (code: string) => api.get<Goal>(`/goals/invite/${code}`).then((r) => r.data),
  join: (id: string, data: { userId: string; name: string }) =>
    api.post<Member>(`/goals/${id}/join`, data).then((r) => r.data),
  members: (id: string) => api.get<Member[]>(`/goals/${id}/members`).then((r) => r.data),
};

export const taskApi = {
  listByGoal: (goalId: string) => api.get<Task[]>(`/tasks/goal/${goalId}`).then((r) => r.data),
  create: (data: Partial<Task>) => api.post<Task>('/tasks', data).then((r) => r.data),
  updateStatus: (id: string, status: Task['status']) =>
    api.patch<Task>(`/tasks/${id}/status`, { status }).then((r) => r.data),
  updateTime: (id: string, increment: number) =>
    api.patch<Task>(`/tasks/${id}/time`, { increment }).then((r) => r.data),
  toggleLike: (id: string, userId: string) =>
    api.patch<Task>(`/tasks/${id}/like`, { userId }).then((r) => r.data),
  update: (id: string, data: Partial<Task>) =>
    api.patch<Task>(`/tasks/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/tasks/${id}`).then((r) => r.data),
  upload: (id: string, file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append('file', file);
    return api
      .post<{ url: string; task: Task }>(`/tasks/${id}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total && onProgress) onProgress(Math.round((ev.loaded / ev.total) * 100));
        },
      })
      .then((r) => r.data);
  },
};
