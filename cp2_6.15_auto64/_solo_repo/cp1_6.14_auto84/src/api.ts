import axios, { AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'code' in response.data) {
      if (response.data.code !== 0) {
        return Promise.reject(new Error(response.data.error || 'Request failed'));
      }
      return response.data;
    }
    return { code: 0, data: response.data };
  },
  (error) => {
    const message = error.response?.data?.error || error.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

export interface Preferences {
  flavors: string[];
  brewMethod: string;
  minBudget: number;
  maxBudget: number;
}

export interface BeanSummary {
  id: string;
  name: string;
  origin: string;
  roastLevel: string;
  price: number;
  image: string;
  flavors: string[];
  avgRating: number;
  reviewCount: number;
  matchScore: number;
  matchStars: number;
}

export interface FlavorProfile {
  acidity: number;
  sweetness: number;
  body: number;
  aroma: number;
  aftertaste: number;
  balance: number;
}

export interface BrewParams {
  temperature: { min: number; max: number };
  grindSize: string;
  time: { min: string; max: string };
}

export interface Review {
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface BeanDetail {
  id: string;
  name: string;
  origin: string;
  roastLevel: string;
  price: number;
  image: string;
  flavors: string[];
  flavorProfile: FlavorProfile;
  brewMethods: string[];
  brewParams: BrewParams;
  avgRating: number;
  reviewCount: number;
  reviews: Review[];
}

export interface RecommendResponse {
  code: number;
  data: BeanSummary[];
  total: number;
  time: number;
}

export interface BeanDetailResponse {
  code: number;
  data: BeanDetail;
}

export interface FeedbackResponse {
  code: number;
  data: {
    success: boolean;
    feedbackId: string;
    newAvgRating: number | null;
  };
}

export const api = {
  getBeansByPreferences: (preferences: Preferences): Promise<RecommendResponse> => {
    return http.post('/recommend', preferences);
  },

  getBeanDetail: (id: string): Promise<BeanDetailResponse> => {
    return http.get(`/beans/${id}`);
  },

  submitTasteFeedback: (params: {
    beanId: string;
    userId?: string;
    rating: number;
    comment?: string;
    satisfaction?: 'like' | 'dislike' | null;
  }): Promise<FeedbackResponse> => {
    return http.post('/feedback', params);
  },
};

export default api;
