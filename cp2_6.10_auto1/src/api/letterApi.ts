import { httpClient, ApiResponse } from './client';

export interface Letter {
  id: string;
  content: string;
  emotion: 'joy' | 'calm' | 'hope' | 'nostalgia';
  unlockTime: string;
  createdAt: string;
  userId: string;
  isUnlocked?: boolean;
}

export interface UserStats {
  totalLetters: number;
  unlockedLetters: number;
  pendingLetters: number;
}

export interface CreateLetterRequest {
  content: string;
  emotion: Letter['emotion'];
  unlockTime: string;
}

export const letterApi = {
  createLetter: (data: CreateLetterRequest) => {
    return httpClient.post<Letter>('/letters', data);
  },

  getLetter: (id: string) => {
    return httpClient.get<Letter>(`/letters/${id}`);
  },

  getServerTime: () => {
    return httpClient.get<{ serverTime: string }>('/server/time');
  },

  getUserLetters: () => {
    return httpClient.get<Letter[]>('/users/letters');
  },

  getUserStats: () => {
    return httpClient.get<UserStats>('/users/stats');
  },
};
