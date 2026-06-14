import axios from 'axios';
import type {
  Customer,
  PointLog,
  Coupon,
  Stats,
  ConsumeResult,
} from './types';

const http = axios.create({
  baseURL: 'http://localhost:4000/api',
  timeout: 5000,
});

let loadingCount = 0;
const onRequestStart = () => {
  loadingCount++;
};
const onRequestEnd = () => {
  loadingCount--;
};

http.interceptors.request.use((config) => {
  onRequestStart();
  return config;
}, (error) => {
  onRequestEnd();
  return Promise.reject(error);
});

http.interceptors.response.use((response) => {
  onRequestEnd();
  return response;
}, (error) => {
  onRequestEnd();
  console.error('Request failed:', error.message);
  return Promise.reject(error);
});

export const customerApi = {
  getAll: (): Promise<Customer[]> =>
    http.get('/customers').then((res) => res.data),

  getById: (id: string): Promise<Customer> =>
    http.get(`/customers/${id}`).then((res) => res.data),

  create: (data: { name: string; phone: string }): Promise<Customer> =>
    http.post('/customers', data).then((res) => res.data),

  batchCreate: (customers: { name: string; phone: string }[]): Promise<Customer[]> =>
    http.post('/customers/batch', { customers }).then((res) => res.data),

  consume: (id: string, amount: number): Promise<ConsumeResult> =>
    http.post(`/customers/${id}/consume`, { amount }).then((res) => res.data),

  getPointLogs: (customerId: string): Promise<PointLog[]> =>
    http.get(`/point-logs/${customerId}`).then((res) => res.data),
};

export const couponApi = {
  getAll: (): Promise<Coupon[]> =>
    http.get('/coupons').then((res) => res.data),

  create: (data: Partial<Coupon>): Promise<Coupon> =>
    http.post('/coupons', data).then((res) => res.data),

  update: (id: string, data: Partial<Coupon>): Promise<Coupon> =>
    http.put(`/coupons/${id}`, data).then((res) => res.data),

  remove: (id: string): Promise<{ success: boolean }> =>
    http.delete(`/coupons/${id}`).then((res) => res.data),
};

export const statsApi = {
  get: (period: 'week' | 'month' = 'month'): Promise<Stats> =>
    http.get('/stats', { params: { period } }).then((res) => res.data),
};

export default http;
