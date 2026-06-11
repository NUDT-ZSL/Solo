import axios from 'axios';
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
    return response.data;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

export type FlowFormData = LeaveForm | ExpenseForm | BusinessForm;

export const createFlow = (
  type: FlowType,
  formData: FlowFormData
): Promise<ApiResponse<FlowInstance>> => {
  return request.post('/flows', { type, formData });
};

export const getFlow = (id: string): Promise<ApiResponse<FlowInstance>> => {
  return request.get(`/flows/${id}`);
};

export const getAllFlows = (): Promise<ApiResponse<FlowInstance[]>> => {
  return request.get('/flows');
};

export const getMyFlows = (): Promise<ApiResponse<FlowInstance[]>> => {
  return request.get('/flows/mine');
};

export const getTodos = (): Promise<ApiResponse<TodoItem[]>> => {
  return request.get('/todos');
};

export const approveFlow = (
  flowId: string,
  nodeId: string,
  comment?: string
): Promise<ApiResponse<FlowInstance>> => {
  return request.post(`/flows/${flowId}/approve`, { nodeId, comment });
};

export const rejectFlow = (
  flowId: string,
  nodeId: string,
  comment?: string
): Promise<ApiResponse<FlowInstance>> => {
  return request.post(`/flows/${flowId}/reject`, { nodeId, comment });
};
