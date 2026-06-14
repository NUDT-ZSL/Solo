import axios from 'axios';
import type {
  ApiResponse,
  CodeSnippet,
  Comment,
  HeatmapData,
  PaginatedResponse,
} from '../types';

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('HTTP 请求错误:', error);
    return Promise.reject(error);
  }
);

async function get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const response = await http.get<ApiResponse<T>>(url, { params });
  return response.data;
}

async function post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  const response = await http.post<ApiResponse<T>>(url, data);
  return response.data;
}

async function put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  const response = await http.put<ApiResponse<T>>(url, data);
  return response.data;
}

export async function fetchSnippets(params?: {
  tags?: string[];
  language?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<PaginatedResponse<CodeSnippet>>> {
  const queryParams: Record<string, unknown> = {};
  if (params?.tags && params.tags.length > 0) {
    queryParams.tags = params.tags.join(',');
  }
  if (params?.language) queryParams.language = params.language;
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;
  return get<PaginatedResponse<CodeSnippet>>('/snippets', queryParams);
}

export async function fetchSnippetById(id: string): Promise<ApiResponse<CodeSnippet>> {
  return get<CodeSnippet>(`/snippets/${id}`);
}

export async function createSnippet(data: {
  code: string;
  language: string;
  tags: string[];
  title?: string;
}): Promise<ApiResponse<CodeSnippet>> {
  return post<CodeSnippet>('/snippets', data);
}

export async function updateSnippetStatus(
  id: string,
  status: CodeSnippet['status']
): Promise<ApiResponse<CodeSnippet>> {
  return put<CodeSnippet>(`/snippets/${id}/status`, { status });
}

export async function fetchComments(
  snippetId: string,
  page: number = 1,
  limit: number = 10
): Promise<ApiResponse<PaginatedResponse<Comment>>> {
  return get<PaginatedResponse<Comment>>(`/snippets/${snippetId}/comments`, { page, limit });
}

export async function addComment(data: {
  snippetId: string;
  content: string;
  lineNumber?: number;
  authorId: string;
}): Promise<ApiResponse<Comment>> {
  return post<Comment>(`/snippets/${data.snippetId}/comments`, {
    content: data.content,
    lineNumber: data.lineNumber,
    authorId: data.authorId,
  });
}

export async function likeSnippet(id: string): Promise<ApiResponse<CodeSnippet>> {
  return put<CodeSnippet>(`/snippets/${id}/like`);
}

export async function fetchHeatmap(): Promise<ApiResponse<HeatmapData[]>> {
  return get<HeatmapData[]>('/heatmap');
}

export async function fetchTags(): Promise<ApiResponse<string[]>> {
  return get<string[]>('/tags');
}

export { get, post, put };
export default http;
