import axios from 'axios';
import type { Article, PlatformConfig, PublishRecord, ArticleVersion } from './types';

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export async function get<T>(url: string): Promise<T> {
  const response = await http.get<T>(url);
  return response.data;
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const response = await http.post<T>(url, data);
  return response.data;
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  const response = await http.put<T>(url, data);
  return response.data;
}

export async function del<T>(url: string): Promise<T> {
  const response = await http.delete<T>(url);
  return response.data;
}

export const api = {
  getArticles: () => get<Article[]>('/articles'),
  getArticle: (id: string) => get<Article>(`/articles/${id}`),
  createArticle: (data: { title: string; body: string }) => post<Article>('/articles', data),
  updateArticle: (id: string, data: { title: string; body: string }) => put<Article>(`/articles/${id}`, data),
  deleteArticle: (id: string) => del<{ success: boolean }>(`/articles/${id}`),
  getVersions: (articleId: string) => get<ArticleVersion[]>(`/articles/${articleId}/versions`),
  restoreVersion: (articleId: string, versionId: string) => 
    post<Article>(`/articles/${articleId}/versions/${versionId}/restore`),
  getPlatforms: () => get<PlatformConfig[]>('/platforms'),
  updatePlatform: (id: string, data: Partial<PlatformConfig>) => 
    put<PlatformConfig>(`/platforms/${id}`, data),
  publishArticle: (articleId: string, platformIds?: string[]) => 
    post<{ articleId: string; status: string; records: PublishRecord[] }>(
      `/articles/${articleId}/publish`,
      { platformIds }
    ),
  getPublishStatus: (articleId: string) => 
    get<{ publishHistory: PublishRecord[] }>(`/articles/${articleId}/publish-status`)
};

export default http;
