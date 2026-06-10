import { Story, Reply, PaginatedResponse, UserStats, CalendarData } from '../types';

const BASE = '/api';

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, opts);
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getStories: (p = 1, limit = 20) =>
    req<PaginatedResponse<Story>>(`/stories?page=${p}&limit=${limit}`),

  getStory: (id: string) => req<Story>(`/stories/${id}`),

  createStory: (d: { title: string; content: string; emotion: string }) =>
    req<Story>('/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }),

  getStoriesByDate: (date: string) => req<Story[]>(`/stories/user/${date}`),

  getReplies: (storyId?: string) =>
    req<Reply[]>(`/replies${storyId ? `?storyId=${storyId}` : ''}`),

  createReply: (d: { storyId: string; content: string; type?: string; emotion?: string }) =>
    req<Reply>('/replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }),

  getUserStats: () => req<UserStats>('/stats/user'),
  getCalendarData: (w = 4) => req<CalendarData>(`/stats/calendar?weeks=${w}`)
};
