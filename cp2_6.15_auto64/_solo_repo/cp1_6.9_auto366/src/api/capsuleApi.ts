import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Capsule,
  CapsuleSummary,
  CreateCapsuleRequest,
  Notification,
} from '../types';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    const status = error.response?.status;
    let message = '请求失败，请稍后重试';

    if (status === 400) {
      message = '请求参数错误';
    } else if (status === 404) {
      message = '资源不存在';
    } else if (status === 500) {
      message = '服务器内部错误';
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时';
    } else if (error.code === 'ERR_NETWORK') {
      message = '网络连接失败，请检查网络';
    }

    console.error('[API Error]', message, error);
    return Promise.reject(new Error(message));
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const capsuleApi = {
  async createCapsule(data: CreateCapsuleRequest): Promise<Capsule> {
    const response = await api.post<ApiResponse<Capsule>, ApiResponse<Capsule>>(
      '/capsules',
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || '创建胶囊失败');
    }
    return response.data;
  },

  async getUserCapsules(userId: string): Promise<Capsule[]> {
    const response = await api.get<ApiResponse<Capsule[]>, ApiResponse<Capsule[]>>(
      '/capsules',
      { params: { user_id: userId } }
    );
    if (!response.success || !response.data) {
      return [];
    }
    return response.data;
  },

  async getCapsuleDetail(capsuleId: string, userId: string): Promise<Capsule> {
    const response = await api.get<ApiResponse<Capsule>, ApiResponse<Capsule>>(
      `/capsules/${capsuleId}`,
      { params: { user_id: userId } }
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || '获取胶囊详情失败');
    }
    return response.data;
  },

  async getCapsuleSummary(capsuleId: string, userId: string): Promise<CapsuleSummary> {
    const response = await api.get<ApiResponse<CapsuleSummary>, ApiResponse<CapsuleSummary>>(
      `/capsules/${capsuleId}/summary`,
      { params: { user_id: userId } }
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || '获取胶囊摘要失败');
    }
    return response.data;
  },

  async markAsRead(capsuleId: string, userId: string): Promise<void> {
    await api.put(`/capsules/${capsuleId}/read`, { user_id: userId });
  },

  async checkNotifications(userId: string): Promise<Notification[]> {
    const response = await api.get<ApiResponse<Notification[]>, ApiResponse<Notification[]>>(
      '/notifications',
      { params: { user_id: userId } }
    );
    if (!response.success || !response.data) {
      return [];
    }
    return response.data;
  },
};

export default capsuleApi;
