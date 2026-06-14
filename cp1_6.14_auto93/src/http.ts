import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || '请求失败';
    return Promise.reject(new Error(message));
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

export async function del<T = any>(url: string, data?: any): Promise<T> {
  return http.delete(url, { data }) as Promise<T>;
}

export async function upload<T = any>(url: string, formData: FormData): Promise<T> {
  return http.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as Promise<T>;
}

export default http;
