import axios, { AxiosInstance } from 'axios';
import type {
  Furniture,
  Review,
  ExchangeRequest,
  ExchangeRequestsResponse,
  User,
  FurnitureStatus,
  ExchangeRequestStatus,
} from '../types';

const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error),
);

export interface GetFurnitureParams {
  category?: string;
  status?: string;
  city?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export const getFurniture = (params?: GetFurnitureParams) => {
  return request.get<Furniture[], Furniture[]>('/furniture', { params });
};

export const getFurnitureDetail = (id: string) => {
  return request.get<Furniture, Furniture>(`/furniture/${id}`);
};

export const getFurnitureReviews = (id: string) => {
  return request.get<Review[], Review[]>(`/furniture/${id}/reviews`);
};

export const createFurniture = (data: Omit<Furniture, 'id' | 'createdAt'>) => {
  return request.post<Furniture, Furniture>('/furniture', data);
};

export const updateFurnitureStatus = (id: string, status: FurnitureStatus) => {
  return request.patch<Furniture, Furniture>(`/furniture/${id}/status`, { status });
};

export const uploadImage = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<{ url: string }, { url: string }>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getExchangeRequests = (userId: string) => {
  return request.get<ExchangeRequestsResponse, ExchangeRequestsResponse>(`/exchange-requests`, {
    params: { userId },
  });
};

export const createExchangeRequest = (
  data: Omit<ExchangeRequest, 'id' | 'createdAt'>,
) => {
  return request.post<ExchangeRequest, ExchangeRequest>('/exchange-requests', data);
};

export const handleExchangeRequest = (
  id: string,
  status: ExchangeRequestStatus,
) => {
  return request.patch<ExchangeRequest, ExchangeRequest>(
    `/exchange-requests/${id}/status`,
    { status },
  );
};

export const markRequestRead = (id: string) => {
  return request.patch<void, void>(`/exchange-requests/${id}/read`);
};

export const markAllRequestsRead = (userId: string) => {
  return request.patch<void, void>('/exchange-requests/read-all', undefined, {
    params: { userId },
  });
};

export const getUser = (id: string) => {
  return request.get<User, User>(`/users/${id}`);
};

export default request;
