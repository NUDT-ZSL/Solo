import axios from 'axios';
import { Snippet, SnippetFormData, SearchParams } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function getSnippets(params?: SearchParams): Promise<Snippet[]> {
  const queryParams: Record<string, string> = {};

  if (params?.lang) {
    queryParams.lang = params.lang;
  }
  if (params?.tags) {
    queryParams.tags = params.tags;
  }
  if (params?.keyword) {
    queryParams.keyword = params.keyword;
  }
  if (params?.sortBy) {
    queryParams.sortBy = params.sortBy;
  }
  if (params?.order) {
    queryParams.order = params.order;
  }

  const response = await api.get<Snippet[]>('/snippets', { params: queryParams });
  return response.data;
}

export async function getSnippetById(id: string): Promise<Snippet> {
  const response = await api.get<Snippet>(`/snippets/${id}`);
  return response.data;
}

export async function addSnippet(data: SnippetFormData): Promise<Snippet> {
  const response = await api.post<Snippet>('/snippets', data);
  return response.data;
}

export async function updateSnippet(id: string, data: SnippetFormData): Promise<Snippet> {
  const response = await api.put<Snippet>(`/snippets/${id}`, data);
  return response.data;
}

export async function deleteSnippet(id: string): Promise<void> {
  await api.delete(`/snippets/${id}`);
}

export async function toggleFavorite(id: string): Promise<Snippet> {
  const response = await api.post<Snippet>(`/snippets/${id}/favorite`);
  return response.data;
}

export async function searchSnippets(
  language?: string,
  tags?: string,
  keyword?: string
): Promise<Snippet[]> {
  const params: SearchParams = {};
  if (language) params.lang = language;
  if (tags) params.tags = tags;
  if (keyword) params.keyword = keyword;
  return getSnippets(params);
}
