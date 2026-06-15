import axios from 'axios';
import type { Endpoint, EndpointCreateRequest, EndpointUpdateRequest, TestResponse } from './types';

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const endpointApi = {
  getAll: (): Promise<Endpoint[]> =>
    http.get('/endpoints').then((res) => res.data),

  getById: (id: string): Promise<Endpoint> =>
    http.get(`/endpoints/${id}`).then((res) => res.data),

  create: (data: EndpointCreateRequest): Promise<Endpoint> =>
    http.post('/endpoints', data).then((res) => res.data),

  update: (id: string, data: EndpointUpdateRequest): Promise<Endpoint> =>
    http.put(`/endpoints/${id}`, data).then((res) => res.data),

  delete: (id: string): Promise<{ success: boolean }> =>
    http.delete(`/endpoints/${id}`).then((res) => res.data),

  test: (method: string, path: string, delay: number): Promise<TestResponse> => {
    const startTime = Date.now();
    const mockPath = `/mock${path}`;
    return axios({
      method: method.toLowerCase(),
      url: mockPath,
      timeout: delay + 5000,
    }).then((res) => ({
      status: res.status,
      statusText: res.statusText,
      data: res.data,
      time: Date.now() - startTime,
    }));
  },
};

export default http;
