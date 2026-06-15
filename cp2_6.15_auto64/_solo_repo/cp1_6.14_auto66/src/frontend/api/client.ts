import axios from 'axios';
import type { PlanRequest, TravelPlan } from '../utils/types';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const generatePlan = async (request: PlanRequest): Promise<TravelPlan> => {
  const response = await apiClient.post<TravelPlan>('/generate-plan', request);
  return response.data;
};

export const checkHealth = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await apiClient.get('/health');
  return response.data;
};

export default apiClient;
