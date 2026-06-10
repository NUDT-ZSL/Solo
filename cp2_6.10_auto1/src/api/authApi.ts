import { httpClient, ApiResponse } from './client';

export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  register: (data: RegisterRequest) => {
    return httpClient.post<AuthResponse>('/auth/register', data);
  },

  login: (data: LoginRequest) => {
    return httpClient.post<AuthResponse>('/auth/login', data);
  },

  getCurrentUser: () => {
    return httpClient.get<User>('/auth/me');
  },
};
