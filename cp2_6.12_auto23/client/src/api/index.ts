import axios, { AxiosError } from 'axios';
import type {
  FlowType,
  FlowInstance,
  ApiResponse,
  LeaveForm,
  ExpenseForm,
  BusinessForm,
  TodoItem,
} from '../types';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

const retryCounts = new Map<string, number>();
const MAX_RETRY = 2;
const RETRY_DELAY = 1000;

function getRequestKey(method: string, url: string, data?: unknown): string {
  return `${method.toUpperCase()}:${url}:${data ? JSON.stringify(data).slice(0, 100) : ''}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

request.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && typeof data === 'object') {
      if ('code' in data && data.code !== 0) {
        const msg = data.message || '请求失败';
        alert(msg);
        return Promise.reject(new Error(msg));
      }
      if ('success' in data && data.success === false) {
        const msg = data.error || data.message || '请求失败';
        alert(msg);
        return Promise.reject(new Error(msg));
      }
    }
    return data;
  },
  async (error: AxiosError) => {
    const config = error.config;
    if (!config) {
      return Promise.reject(error);
    }

    const method = config.method || 'get';
    const url = config.url || '';
    const data = config.data;
    const key = getRequestKey(method, url, data);

    const code = error.code;
    const status = error.response?.status;

    if (code === 'ERR_NETWORK' || code === 'ECONNABORTED') {
      const current = retryCounts.get(key) || 0;
      if (current < MAX_RETRY) {
        retryCounts.set(key, current + 1);
        await sleep(RETRY_DELAY);
        return request.request(config);
      } else {
        retryCounts.delete(key);
        alert('网络错误，请检查网络连接后重试');
        return Promise.reject(error);
      }
    }

    if (status && status >= 500) {
      alert('服务器错误，请稍后重试');
    } else if (status && status >= 400) {
      const respData = error.response?.data as any;
      const msg = respData?.error || respData?.message || `请求失败 (${status})`;
      alert('请求失败: ' + msg);
    } else {
      console.error('请求错误:', error);
    }

    return Promise.reject(error);
  }
);

export type FlowFormData = LeaveForm | ExpenseForm | BusinessForm;

export interface CreateFlowPayload {
  type: FlowType;
  formData: FlowFormData;
  creatorId: string;
  creatorName: string;
}

export const createFlow = (
  payload: CreateFlowPayload
): Promise<ApiResponse<FlowInstance> & { success?: boolean }> => {
  return request.post('/flows', payload);
};

export const getFlow = (id: string): Promise<ApiResponse<FlowInstance> & { success?: boolean }> => {
  return request.get(`/flows/${id}`);
};

export const getAllFlows = (): Promise<ApiResponse<FlowInstance[]> & { success?: boolean }> => {
  return request.get('/flows');
};

export const getMyFlows = (creatorId: string): Promise<ApiResponse<FlowInstance[]> & { success?: boolean }> => {
  return request.get(`/me/flows?creatorId=${encodeURIComponent(creatorId)}`);
};

export const getTodos = (userId?: string): Promise<ApiResponse<TodoItem[]> & { success?: boolean; data?: any }> => {
  if (userId) {
    return request.get(`/todos/${encodeURIComponent(userId)}`);
  }
  return request.get('/todos');
};

export const approveFlow = (
  flowId: string,
  handlerId: string,
  comment?: string
): Promise<ApiResponse<FlowInstance> & { success?: boolean }> => {
  return request.post(`/flows/${flowId}/approve`, { handlerId, comment });
};

export const rejectFlow = (
  flowId: string,
  handlerId: string,
  comment?: string
): Promise<ApiResponse<FlowInstance> & { success?: boolean }> => {
  return request.post(`/flows/${flowId}/reject`, { handlerId, comment });
};
