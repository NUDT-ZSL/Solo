import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    console.error('[HTTP Request Error]', error);
    return Promise.reject(error);
  }
);

http.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  (error: AxiosError): Promise<never> => {
    console.error('[HTTP Response Error]', error.message);
    const message =
      (error.response?.data as ApiResponse)?.error ||
      error.message ||
      '网络异常，请稍后重试';
    return Promise.reject(new Error(message));
  }
);

export default http;
