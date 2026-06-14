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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

type LoadingListener = (loading: boolean) => void;
type ErrorListener = (error: string) => void;

class HttpClient {
  private instance: AxiosInstance;
  private loadingCount: number = 0;
  private loadingListeners: LoadingListener[] = [];
  private errorListeners: ErrorListener[] = [];

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
        this.loadingCount++;
        this.notifyLoading(true);
        return config;
      },
      (error: AxiosError) => {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        if (this.loadingCount === 0) {
          this.notifyLoading(false);
        }
        return Promise.reject(error);
      }
    );

    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        if (this.loadingCount === 0) {
          this.notifyLoading(false);
        }
        return response;
      },
      (error: AxiosError) => {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        if (this.loadingCount === 0) {
          this.notifyLoading(false);
        }
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private notifyLoading(loading: boolean): void {
    this.loadingListeners.forEach((listener) => listener(loading));
  }

  private notifyError(error: string): void {
    this.errorListeners.forEach((listener) => listener(error));
  }

  private handleError(error: AxiosError): void {
    let message = '请求失败，请稍后重试';
    if (error.response) {
      switch (error.response.status) {
        case 400:
          message = '请求参数错误';
          break;
        case 401:
          message = '未授权，请重新登录';
          break;
        case 403:
          message = '拒绝访问';
          break;
        case 404:
          message = '请求资源不存在';
          break;
        case 500:
          message = '服务器内部错误';
          break;
        default:
          message = `请求错误 (${error.response.status})`;
      }
    } else if (error.request) {
      message = '网络错误，请检查网络连接';
    }
    this.notifyError(message);
  }

  public onLoading(listener: LoadingListener): () => void {
    this.loadingListeners.push(listener);
    return () => {
      this.loadingListeners = this.loadingListeners.filter((l) => l !== listener);
    };
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter((l) => l !== listener);
    };
  }

  public get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.get<ApiResponse<T>>(url, config);
  }

  public post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.post<ApiResponse<T>>(url, data, config);
  }

  public put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.put<ApiResponse<T>>(url, data, config);
  }

  public delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.delete<ApiResponse<T>>(url, config);
  }
}

const http = new HttpClient();

export default http;
