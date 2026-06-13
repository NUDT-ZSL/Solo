import axios from 'axios';
import { Snippet, SnippetFormData, SearchParams } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

function isValidParam(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function getSnippets(params?: SearchParams): Promise<Snippet[]> {
  const queryParams: Record<string, string> = {};

  if (isValidParam(params?.lang)) {
    queryParams.lang = params!.lang.trim();
  }
  if (isValidParam(params?.tags)) {
    queryParams.tags = params!.tags.trim();
  }
  if (isValidParam(params?.keyword)) {
    queryParams.keyword = params!.keyword.trim();
  }
  if (isValidParam(params?.sortBy)) {
    queryParams.sortBy = params!.sortBy.trim();
  }
  if (isValidParam(params?.order)) {
    queryParams.order = params!.order.trim();
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
  if (isValidParam(language)) params.lang = language.trim();
  if (isValidParam(tags)) params.tags = tags.trim();
  if (isValidParam(keyword)) params.keyword = keyword.trim();
  return getSnippets(params);
}
