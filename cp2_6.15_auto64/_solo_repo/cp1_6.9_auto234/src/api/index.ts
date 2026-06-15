import axios from 'axios';
import type { Note, TrashNote } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const noteApi = {
  getTags: () => api.get<{ tags: string[] }>('/tags'),

  getNotes: (params?: { search?: string; sort?: 'asc' | 'desc'; tag?: string }) =>
    api.get<{ notes: Note[] }>('/notes', { params }),

  getNote: (id: string) =>
    api.get<{ note: Note }>(`/notes/${id}`),

  createNote: (data: Partial<Note>) =>
    api.post<{ note: Note }>('/notes', data),

  updateNote: (id: string, data: Partial<Note>) =>
    api.put<{ note: Note }>(`/notes/${id}`, data),

  deleteNote: (id: string) =>
    api.delete<{ message: string }>(`/notes/${id}`),

  getTrash: (params?: { search?: string }) =>
    api.get<{ trash: TrashNote[] }>('/trash', { params }),

  restoreNote: (id: string) =>
    api.post<{ message: string; note: Note }>(`/trash/${id}/restore`),

  permanentDelete: (id: string) =>
    api.delete<{ message: string }>(`/trash/${id}`),

  emptyTrash: () =>
    api.delete<{ message: string }>('/trash')
};

export default api;
