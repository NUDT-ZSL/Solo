import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface Comment {
  id: string;
  userName: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
}

export interface Work {
  id: string;
  title: string;
  cover: string;
  audio: string;
  lyrics: string[];
  plays: number;
  status: 'pending' | 'published';
  createdAt: string;
  averageDuration: number;
  comments: Comment[];
  dailyPlays: { date: string; plays: number }[];
  sourceDistribution: { name: string; value: number }[];
  interactions: { day: string; comments: number; likes: number; shares: number }[];
}

export interface WorkStats {
  totalPlays: number;
  averageDuration: number;
  dailyPlays: { date: string; plays: number }[];
  sourceDistribution: { name: string; value: number }[];
  interactions: { day: string; comments: number; likes: number; shares: number }[];
}

class HttpClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.instance.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        console.log(`[Request] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Request Error]', error);
        return Promise.reject(error);
      }
    );

    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`[Response] ${response.status} ${response.config.url}`);
        return response.data;
      },
      (error) => {
        console.error('[Response Error]', error);
        return Promise.reject(error);
      }
    );
  }

  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get(url, config);
  }

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post(url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put(url, data, config);
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, config);
  }
}

const http = new HttpClient();

export const getWorks = (): Promise<Work[]> => {
  return http.get<Work[]>('/works');
};

export const getWorkDetail = (id: string): Promise<Work> => {
  return http.get<Work>(`/works/${id}`);
};

export const submitComment = (
  id: string,
  data: { userName: string; content: string }
): Promise<Comment> => {
  return http.post<Comment>(`/works/${id}/comments`, data);
};

export const getWorkStats = (id: string): Promise<WorkStats> => {
  return http.get<WorkStats>(`/works/${id}/stats`);
};

export const approveWork = (id: string): Promise<{ success: boolean; message: string; work: Work }> => {
  return http.post<{ success: boolean; message: string; work: Work }>(`/works/${id}/approve`);
};

export default http;
