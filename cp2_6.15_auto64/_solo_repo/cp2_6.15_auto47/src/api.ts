import type { Project, Frame, DialogBubble, Comment, ExportConfig } from './types';

const BASE_URL = '';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `请求失败: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function getProjects(): Promise<Project[]> {
  return request<Project[]>('/api/projects');
}

export function createProject(name: string): Promise<Project> {
  return request<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function getProject(id: string): Promise<Project & { frames: Frame[] }> {
  return request<Project & { frames: Frame[] }>(`/api/projects/${id}`);
}

export function createFrame(frame: Omit<Frame, 'id'>): Promise<Frame> {
  return request<Frame>('/api/frames', {
    method: 'POST',
    body: JSON.stringify(frame),
  });
}

export function updateFrame(id: string, data: Partial<Frame>): Promise<Frame> {
  return request<Frame>(`/api/frames/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteFrame(id: string): Promise<void> {
  return request<void>(`/api/frames/${id}`, {
    method: 'DELETE',
  });
}

export function getComments(
  frameId: string,
  page: number,
  pageSize: number
): Promise<{ list: Comment[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return request<{ list: Comment[]; total: number }>(
    `/api/frames/${frameId}/comments?${params.toString()}`
  );
}

export function createComment(
  comment: Omit<Comment, 'id' | 'createdAt'>
): Promise<Comment> {
  return request<Comment>('/api/comments', {
    method: 'POST',
    body: JSON.stringify(comment),
  });
}

export function createDialog(
  dialog: Omit<DialogBubble, 'id'>
): Promise<DialogBubble> {
  return request<DialogBubble>('/api/dialogs', {
    method: 'POST',
    body: JSON.stringify(dialog),
  });
}

export function updateDialog(
  id: string,
  data: Partial<DialogBubble>
): Promise<DialogBubble> {
  return request<DialogBubble>(`/api/dialogs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteDialog(id: string): Promise<void> {
  return request<void>(`/api/dialogs/${id}`, {
    method: 'DELETE',
  });
}

export function getFrameDialogs(frameId: string): Promise<DialogBubble[]> {
  return request<DialogBubble[]>(`/api/frames/${frameId}/dialogs`);
}

export async function exportProject(
  projectId: string,
  config: ExportConfig
): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/api/projects/${projectId}/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `导出失败: ${response.status} ${response.statusText}`);
  }

  return response.blob();
}
