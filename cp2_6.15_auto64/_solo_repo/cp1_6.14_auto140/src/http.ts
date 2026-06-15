import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

http.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const message = error.response.data?.error || '请求失败';
      console.error('API Error:', message);
      return Promise.reject(new Error(message));
    } else if (error.request) {
      console.error('Network Error:', error.message);
      return Promise.reject(new Error('网络连接失败，请检查网络'));
    } else {
      console.error('Error:', error.message);
      return Promise.reject(error);
    }
  }
);

export interface Card {
  id: string;
  cardNumber: string;
  balance: number;
  points: number;
  createdAt: string;
}

export interface CardDetail extends Card {
  consumeRecords: ConsumeRecord[];
  pointsLog: PointsLog[];
}

export interface ConsumeRecord {
  id: string;
  time: string;
  amount: number;
  remainingBalance: number;
  pointsEarned: number;
}

export interface PointsLog {
  id: string;
  time: string;
  points: number;
  item: string;
  type: string;
}

export const cardApi = {
  getCards: (): Promise<Card[]> => http.get('/cards'),
  createCard: (data: { cardNumber?: string; initialBalance: number }): Promise<Card> =>
    http.post('/cards', data),
  getCardDetail: (id: string): Promise<CardDetail> => http.get(`/cards/${id}`),
  consume: (id: string, amount: number): Promise<{ balance: number; points: number; record: ConsumeRecord }> =>
    http.post(`/cards/${id}/consume`, { amount }),
  redeem: (id: string, points: number, item: string): Promise<{ points: number; log: PointsLog }> =>
    http.post(`/cards/${id}/redeem`, { points, item }),
};

export default http;
