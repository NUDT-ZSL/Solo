import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

export type ThemeType = 'warm' | 'cool' | 'neon' | 'soft';

export interface Comment {
  id: string;
  artworkId: string;
  username: string;
  avatar: string;
  content: string;
  createdAt: number;
}

export interface Artwork {
  id: string;
  galleryId: string;
  title: string;
  author: string;
  description: string;
  thumbnail: string;
  image: string;
  likes: number;
  comments: Comment[];
  position: number;
}

export interface Gallery {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  artworks: Artwork[];
}

export interface GalleryListItem {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  artworkCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface CreateCommentRequest {
  username: string;
  avatar?: string;
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

type LoadingListener = (loading: boolean) => void;
type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastMessage {
  id: string;
  type: ToastType;
  content: string;
}

type ToastListener = (toast: ToastMessage) => void;
type AuthListener = () => void;

class HttpClient {
  private instance: AxiosInstance;
  private loadingCount: number = 0;
  private loadingListeners: LoadingListener[] = [];
  private toastListeners: ToastListener[] = [];
  private authListeners: AuthListener[] = [];
  private requestStartTimes: Map<string, number> = new Map();

  constructor(baseURL: string = '/api') {
    this.instance = axios.create({
      baseURL,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const reqId = `${config.method}-${config.url}-${Date.now()}`;
        (config as InternalAxiosRequestConfig & { _reqId?: string })._reqId = reqId;
        this.requestStartTimes.set(reqId, Date.now());

        this.loadingCount++;
        this.notifyLoading(true);

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        if (this.loadingCount === 0) {
          this.notifyLoading(false);
        }
        this.showToast('error', '请求初始化失败');
        return Promise.reject(error);
      }
    );

    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        this.decrementLoading(response.config as InternalAxiosRequestConfig & { _reqId?: string });

        const data = response.data as ApiResponse<unknown>;
        if (data && typeof data === 'object' && 'success' in data && data.success === false && data.message) {
          this.showToast('warning', data.message);
        }
        return response;
      },
      (error: AxiosError) => {
        const config = error.config as (InternalAxiosRequestConfig & { _reqId?: string }) | undefined;
        if (config) {
          this.decrementLoading(config);
        } else {
          this.loadingCount = Math.max(0, this.loadingCount - 1);
          if (this.loadingCount === 0) {
            this.notifyLoading(false);
          }
        }
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private decrementLoading(config: InternalAxiosRequestConfig & { _reqId?: string }): void {
    if (config._reqId) {
      this.requestStartTimes.delete(config._reqId);
    }
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0) {
      this.notifyLoading(false);
    }
  }

  private notifyLoading(loading: boolean): void {
    this.loadingListeners.forEach((listener) => listener(loading));
  }

  private showToast(type: ToastType, content: string): void {
    const toast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      content,
    };
    this.toastListeners.forEach((listener) => listener(toast));
  }

  public notifySuccess(content: string): void {
    this.showToast('success', content);
  }

  public notifyError(content: string): void {
    this.showToast('error', content);
  }

  private handleError(error: AxiosError): void {
    let message = '请求失败，请稍后重试';
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 400:
          message = this.extractErrorMessage(error) || '请求参数错误';
          break;
        case 401:
          message = '登录已过期，请重新登录';
          this.authListeners.forEach((listener) => listener());
          break;
        case 403:
          message = '没有权限访问该资源';
          break;
        case 404:
          message = this.extractErrorMessage(error) || '请求的资源不存在';
          break;
        case 409:
          message = '数据冲突，请刷新后重试';
          break;
        case 422:
          message = '数据验证失败，请检查输入';
          break;
        case 429:
          message = '操作过于频繁，请稍后再试';
          break;
        case 500:
          message = '服务器内部错误，请稍后再试';
          break;
        case 502:
        case 503:
        case 504:
          message = '服务器暂时不可用，请稍后再试';
          break;
        default:
          message = `请求错误 (${status})`;
      }
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时，请检查网络连接';
    } else if (error.request) {
      message = '网络错误，请检查网络连接';
    } else if (error.message) {
      message = error.message;
    }
    this.showToast('error', message);
  }

  private extractErrorMessage(error: AxiosError): string | null {
    const data = error.response?.data as ApiResponse<unknown> | undefined;
    if (data && data.message) {
      return data.message;
    }
    return null;
  }

  public onLoading(listener: LoadingListener): () => void {
    this.loadingListeners.push(listener);
    return () => {
      this.loadingListeners = this.loadingListeners.filter((l) => l !== listener);
    };
  }

  public onToast(listener: ToastListener): () => void {
    this.toastListeners.push(listener);
    return () => {
      this.toastListeners = this.toastListeners.filter((l) => l !== listener);
    };
  }

  public onAuthRequired(listener: AuthListener): () => void {
    this.authListeners.push(listener);
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== listener);
    };
  }

  public async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  public async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

const http = new HttpClient();

export default http;
