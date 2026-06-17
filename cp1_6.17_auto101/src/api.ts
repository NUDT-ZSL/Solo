const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function setToken(token: string): void {
  localStorage.setItem('token', token);
}

function removeToken(): void {
  localStorage.removeItem('token');
}

function getUser(): { userId: string; username: string } | null {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
}

function setUser(user: { userId: string; username: string }): void {
  localStorage.setItem('user', JSON.stringify(user));
}

function removeUser(): void {
  localStorage.removeItem('user');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    removeUser();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('登录已过期，请重新登录');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data;
}

async function uploadFile<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401) {
    removeToken();
    removeUser();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('登录已过期，请重新登录');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '上传失败');
  }

  return data;
}

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  style: string;
  price: number;
  authorId: string;
  authorName: string;
  watermarkedPath: string;
  createdAt: string;
}

export interface WorkListResponse {
  works: WorkItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PurchaseItem {
  transactionId: string;
  workId: string;
  title: string;
  thumbnailPath: string;
  style: string;
  amount: number;
  purchasedAt: string;
}

export interface BuyResponse {
  transactionId: string;
  originalPath: string;
  message: string;
}

export const api = {
  auth: {
    register: (username: string, password: string) =>
      request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    login: (username: string, password: string) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    verify: () => request('/auth/verify'),
  },

  works: {
    list: (params: { page?: number; limit?: number; style?: string; sort?: string } = {}) => {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.style) query.set('style', params.style);
      if (params.sort) query.set('sort', params.sort);
      return request<WorkListResponse>(`/works/list?${query.toString()}`);
    },
    detail: (id: string) => request<WorkItem>(`/works/${id}`),
    buy: (id: string) =>
      request<BuyResponse>(`/works/${id}/purchase`, { method: 'POST' }),
    upload: (formData: FormData) => uploadFile<{ id: string; message: string }>('/works/upload', formData),
    purchases: (sort?: string) =>
      request<{ purchases: PurchaseItem[] }>(`/works/user/purchases${sort ? `?sort=${sort}` : ''}`),
  },

  setToken,
  getToken,
  removeToken,
  getUser,
  setUser,
  removeUser,
};
