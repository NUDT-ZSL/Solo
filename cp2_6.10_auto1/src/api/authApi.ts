import { httpClient } from './client';

export interface UserInfo {
  id: string;
  username: string;
}

export interface AuthResult {
  token: string;
  user: UserInfo;
}

export const authApi = {
  register: (username: string, password: string) => {
    return httpClient.post<AuthResult>('/auth/register', { username, password });
  },

  login: (username: string, password: string) => {
    return httpClient.post<AuthResult>('/auth/login', { username, password });
  },

  getMe: () => {
    return httpClient.get<UserInfo>('/auth/me');
  },

  logout: () => {
    return httpClient.post<void>('/auth/logout');
  },

  getServerTime: () => {
    return httpClient.get<{ serverTime: number }>('/auth/time');
  },
};
