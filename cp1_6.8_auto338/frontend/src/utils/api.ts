export interface PoemLine {
  id: string;
  content: string;
  anonymous_id: string;
  created_at: string;
  stitch_count: number;
}

export interface Poem {
  id: string;
  lines: PoemLine[];
  created_at: string;
  stitch_count: number;
}

export interface UserProfile {
  anonymous_id: string;
  lines: PoemLine[];
  total_lines: number;
  total_stitched: number;
}

export interface SearchResult {
  type: 'line' | 'user';
  data: PoemLine | UserProfile;
}

const BASE_URL = 'http://localhost:8000';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

export function submitLine(content: string) {
  return request<Poem>('/api/poems/submit', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function getRecentPoems(limit = 20) {
  return request<Poem[]>(`/api/poems/recent?limit=${limit}`);
}

export function getUserProfile(anonymousId: string) {
  return request<UserProfile>(`/api/users/${anonymousId}`);
}

export function getHotPoems() {
  return request<Poem[]>('/api/poems/hot');
}

export function searchPoems(query: string) {
  return request<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`);
}
