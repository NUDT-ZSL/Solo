import type { Idea, CreateIdeaRequest, FilterType } from './types';

const API_BASE = '/api';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const finalOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  const response = await fetch(`${API_BASE}${url}`, finalOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `请求失败: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export function fetchIdeas(date?: string): Promise<Idea[]> {
  const url = date ? `/ideas?date=${encodeURIComponent(date)}` : '/ideas';
  return request<Idea[]>(url, { method: 'GET' });
}

export function createIdea(data: CreateIdeaRequest): Promise<Idea> {
  return request<Idea>('/ideas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchMembers(): Promise<string[]> {
  return request<string[]>('/members', { method: 'GET' });
}

export function filterIdeasByType(ideas: Idea[], filter: FilterType): Idea[] {
  if (filter === 'all') {
    return ideas;
  }
  return ideas.filter((idea) => idea.type === filter);
}
