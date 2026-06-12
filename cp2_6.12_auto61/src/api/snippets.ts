import axios from 'axios';

export interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  tags: string[];
  created_at: string;
}

export interface Comment {
  id: string;
  snippet_id: string;
  username: string;
  content: string;
  created_at: string;
}

const api = axios.create({ baseURL: '/api' });

export const getSnippets = () => api.get<Snippet[]>('/snippets').then(r => r.data);
export const getSnippet = (id: string) => api.get<Snippet>(`/snippets/${id}`).then(r => r.data);
export const createSnippet = (data: Omit<Snippet, 'id' | 'created_at'>) => api.post<Snippet>('/snippets', data).then(r => r.data);
export const updateSnippet = (id: string, data: Omit<Snippet, 'id' | 'created_at'>) => api.put<Snippet>(`/snippets/${id}`, data).then(r => r.data);
export const deleteSnippet = (id: string) => api.delete(`/snippets/${id}`).then(r => r.data);

export const getComments = (snippetId: string) => api.get<Comment[]>(`/snippets/${snippetId}/comments`).then(r => r.data);
export const createComment = (snippetId: string, data: { content: string; username?: string }) => api.post<Comment>(`/snippets/${snippetId}/comments`, data).then(r => r.data);
export const deleteComment = (commentId: string) => api.delete(`/comments/${commentId}`).then(r => r.data);
