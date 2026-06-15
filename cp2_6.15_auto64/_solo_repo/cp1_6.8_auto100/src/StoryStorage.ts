export interface StoryData {
  id: string;
  title: string | null;
  content: string;
  style: string;
  created_at: string;
  read_count: number;
  salvage_count: number;
}

export interface StoryCreatePayload {
  title?: string;
  content: string;
  style: string;
}

const API_BASE = '/api/stories';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || '请求失败');
  }
  return resp.json();
}

export const StoryStorage = {
  async list(): Promise<StoryData[]> {
    return request<StoryData[]>(API_BASE);
  },

  async hot(): Promise<StoryData[]> {
    return request<StoryData[]>(`${API_BASE}/hot`);
  },

  async random(): Promise<StoryData> {
    return request<StoryData>(`${API_BASE}/random`);
  },

  async create(payload: StoryCreatePayload): Promise<StoryData> {
    return request<StoryData>(API_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async read(id: string): Promise<StoryData> {
    return request<StoryData>(`${API_BASE}/${id}/read`, { method: 'POST' });
  },

  async salvage(id: string): Promise<StoryData> {
    return request<StoryData>(`${API_BASE}/${id}/salvage`, { method: 'POST' });
  },
};
