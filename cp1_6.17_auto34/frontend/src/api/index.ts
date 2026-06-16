import axios from 'axios';
import {
  User,
  AuthResponse,
  SpecialDrink,
  GroupOrder,
  Post,
  CreateOrderData,
  HiddenMenu
} from '../types';

const TOKEN_KEY = 'cc_token';
const USER_KEY = 'cc_user';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    return Promise.reject(error);
  }
);

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function register(nickname: string, avatar: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/register', { nickname, avatar, password });
  return res.data;
}

export async function login(nickname: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/login', { nickname, password });
  return res.data;
}

export async function fetchSpecials(): Promise<SpecialDrink[]> {
  const res = await api.get<SpecialDrink[]>('/specials');
  return res.data;
}

export async function fetchOrders(): Promise<GroupOrder[]> {
  const res = await api.get<GroupOrder[]>('/orders');
  return res.data;
}

export async function createOrder(data: CreateOrderData): Promise<GroupOrder> {
  const res = await api.post<GroupOrder>('/orders', data);
  return res.data;
}

export async function joinOrder(orderId: string, drinkId: string, drinkName: string): Promise<GroupOrder> {
  const res = await api.post<GroupOrder>(`/orders/${orderId}/join`, { drinkId, drinkName });
  return res.data;
}

export async function fetchPosts(): Promise<Post[]> {
  const res = await api.get<Post[]>('/posts');
  return res.data;
}

export async function createPost(hiddenMenu: HiddenMenu): Promise<Post> {
  const res = await api.post<Post>('/posts', { hiddenMenu });
  return res.data;
}

export async function toggleLike(postId: string): Promise<Post> {
  const res = await api.post<Post>(`/posts/${postId}/like`);
  return res.data;
}
