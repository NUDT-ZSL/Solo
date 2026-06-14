import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

http.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('HTTP Error:', error);
    return Promise.reject(error);
  }
);

export default http;

export const petApi = {
  getList: (params: { page: number; limit: number; search?: string; breed?: string }) =>
    http.get<never, { data: any; total: number; page: number; hasMore: boolean }>('/pets', { params }),
  getById: (id: string) => http.get<never, any>(`/pets/${id}`),
  create: (data: any) => http.post<never, any>('/pets', data),
  update: (id: string, data: any) => http.put<never, any>(`/pets/${id}`, data),
  delete: (id: string) => http.delete<never, { success: boolean }>(`/pets/${id}`),
};

export const applicationApi = {
  getList: (params?: { status?: string }) =>
    http.get<never, any[]>('/applications', { params }),
  updateStatus: (id: string, status: string) =>
    http.patch<never, any>(`/applications/${id}/status`, { status }),
};

export const breedApi = {
  getList: () => http.get<never, string[]>('/breeds'),
};
