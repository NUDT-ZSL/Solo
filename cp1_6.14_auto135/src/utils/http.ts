import axios from 'axios';
import type { Beer, BeerInput, Stats } from '../types';

const http = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('HTTP Error:', error.message);
    return Promise.reject(error);
  }
);

export const api = {
  getBeers: () => http.get<never, Beer[]>('/beers'),
  getBeer: (id: string) => http.get<never, Beer>(`/beers/${id}`),
  createBeer: (data: BeerInput) => http.post<never, Beer>('/beers', data),
  updateBeer: (id: string, data: BeerInput) => http.put<never, Beer>(`/beers/${id}`, data),
  deleteBeer: (id: string) => http.delete<never, { success: boolean }>(`/beers/${id}`),
  getRecommendations: (id: string) => http.get<never, Beer[]>(`/beers/${id}/recommendations`),
  getStats: () => http.get<never, Stats>('/stats')
};
