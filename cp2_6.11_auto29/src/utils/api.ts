import { Story, Reply, PaginatedResponse, UserStats, CalendarData } from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE_URL + url, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getStories: (page: number = 1, limit: number = 20) =>
    request<PaginatedResponse<Story>>(`/stories?page=${page}&limit=${limit}`),

  getStory: (id: string) =>
    request<Story>(`/stories/${id}`),

  createStory: (data: { title: string; content: string; emotion: string }) =>
    request<Story>('/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

  getStoriesByDate: (date: string) =>
    request<Story[]>(`/stories/user/${date}`),

  getReplies: (storyId?: string) =>
    request<Reply[]>(`/replies${storyId ? `?storyId=${storyId}` : ''}`),

  createReply: (data: { storyId: string; content: string; type?: string; emotion?: string }) =>
    request<Reply>('/replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

  getUserStats: () =>
    request<UserStats>('/stats/user'),

  getCalendarData: (weeks: number = 4) =>
    request<CalendarData>(`/stats/calendar?weeks=${weeks}`)
};
