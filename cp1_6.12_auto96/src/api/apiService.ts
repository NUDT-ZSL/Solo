export interface Annotation {
  id: string;
  versionId: string;
  x: number;
  y: number;
  content: string;
  author: string;
  createdAt: string;
}

export interface Version {
  id: string;
  name: string;
  image: string;
  createdAt: string;
}

export interface CompareResult {
  version1: Version;
  version2: Version;
  annotations1: Annotation[];
  annotations2: Annotation[];
  changedAnnotations: Array<{
    type: 'added' | 'removed' | 'modified';
    annotation: Annotation;
    original?: Annotation;
  }>;
}

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

export const apiService = {
  getVersions: () => request<Version[]>('/versions'),

  createVersion: (name: string, image: string) =>
    request<Version>('/versions', {
      method: 'POST',
      body: JSON.stringify({ name, image })
    }),

  getVersion: (id: string) => request<Version>(`/versions/${id}`),

  deleteVersion: (id: string) =>
    request<{ message: string }>(`/versions/${id}`, {
      method: 'DELETE'
    }),

  getAnnotations: (versionId: string) =>
    request<Annotation[]>(`/versions/${versionId}/annotations`),

  createAnnotation: (
    versionId: string,
    data: { x: number; y: number; content: string; author: string }
  ) =>
    request<Annotation>(`/versions/${versionId}/annotations`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateAnnotation: (
    id: string,
    data: { x?: number; y?: number; content?: string }
  ) =>
    request<Annotation>(`/annotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteAnnotation: (id: string) =>
    request<{ message: string }>(`/annotations/${id}`, {
      method: 'DELETE'
    }),

  compareVersions: (version1Id: string, version2Id: string) =>
    request<CompareResult>(`/compare/${version1Id}/${version2Id}`)
};
