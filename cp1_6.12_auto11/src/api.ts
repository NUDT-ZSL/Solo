export interface Article {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Version {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  content: string;
  editor_nickname: string;
  created_at: string;
}

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

export function getArticles(search?: string): Promise<Article[]> {
  const url = search ? `/articles?search=${encodeURIComponent(search)}` : '/articles';
  return request<Article[]>(url);
}

export function searchArticles(keyword: string): Promise<Article[]> {
  return getArticles(keyword);
}

export function createArticle(
  title: string,
  content: string,
  editorNickname: string
): Promise<Article> {
  return request<Article>('/articles', {
    method: 'POST',
    body: JSON.stringify({ title, content, editorNickname })
  });
}

export function updateArticle(
  id: string,
  title: string,
  content: string,
  editorNickname: string
): Promise<Article> {
  return request<Article>(`/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title, content, editorNickname })
  });
}

export function getArticleById(id: string): Promise<Article> {
  return request<Article>(`/articles/${id}`);
}

export function getVersions(articleId: string): Promise<Version[]> {
  return request<Version[]>(`/articles/${articleId}/versions`);
}

export function getVersionById(articleId: string, versionId: string): Promise<Version> {
  return request<Version>(`/articles/${articleId}/versions/${versionId}`);
}

export function restoreVersion(
  articleId: string,
  versionId: string,
  editorNickname: string
): Promise<Article> {
  return request<Article>(`/articles/${articleId}/restore/${versionId}`, {
    method: 'POST',
    body: JSON.stringify({ editorNickname })
  });
}
