import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'comic_app_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('comic_app_user');
    return raw ? JSON.parse(raw) : { id: 'user1', name: '漫画师A', avatar: '' };
  } catch {
    return { id: 'user1', name: '漫画师A', avatar: '' };
  }
};

const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.headers && config.method === 'post' && !(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    console.error('[HTTP Request Error]', error);
    return Promise.reject(error);
  }
);

http.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message || '请求失败，请稍后重试';

    if (status === 401) {
      clearToken();
      console.warn('身份验证失败，请重新登录');
    } else if (status === 403) {
      console.warn('没有权限执行此操作');
    } else if (status === 404) {
      console.warn('请求的资源不存在');
    } else if (status >= 500) {
      console.error('服务器错误');
    }

    const err = new Error(message);
    (err as any).status = status;
    (err as any).data = error.response?.data;
    return Promise.reject(err);
  }
);

export async function get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
  return http.get(url, { params }) as Promise<T>;
}

export async function post<T = any>(url: string, data?: any): Promise<T> {
  return http.post(url, data) as Promise<T>;
}

export async function put<T = any>(url: string, data?: any): Promise<T> {
  return http.put(url, data) as Promise<T>;
}

export async function patch<T = any>(url: string, data?: any): Promise<T> {
  return http.patch(url, data) as Promise<T>;
}

export async function del<T = any>(url: string, data?: any): Promise<T> {
  return http.delete(url, { data }) as Promise<T>;
}

export async function upload<T = any>(url: string, formData: FormData, onProgress?: (pct: number) => void): Promise<T> {
  return http.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress ? (evt) => {
      if (evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total));
    } : undefined,
  }) as Promise<T>;
}

export default http;
