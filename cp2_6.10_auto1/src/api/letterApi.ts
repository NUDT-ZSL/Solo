import { httpClient } from './client';
import type { Emotion } from '../../shared/types';

export interface CreateLetterRequest {
  title: string;
  recipientEmail: string;
  content: string;
  emotion: Emotion;
  unlockAt: number;
}

export interface CreateLetterResult {
  id: string;
  title: string;
  emotion: Emotion;
  unlockAt: number;
  createdAt: number;
  shareUrl: string;
}

export interface LetterDetail {
  id: string;
  title: string;
  recipientEmail: string;
  content?: string;
  emotion: Emotion;
  unlockAt: number;
  createdAt: number;
  isUnlocked: boolean;
}

export interface LetterListItem {
  id: string;
  title: string;
  recipientEmail: string;
  emotion: Emotion;
  unlockAt: number;
  createdAt: number;
  isUnlocked: boolean;
  status: 'sent' | 'unlocked' | 'expired';
}

export interface LetterListResult {
  items: LetterListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserStats {
  total: number;
  unlocked: number;
  locked: number;
}

export const letterApi = {
  createLetter: (data: CreateLetterRequest) => {
    return httpClient.post<CreateLetterResult>('/letters', data);
  },

  getPublicLetter: (id: string) => {
    return httpClient.get<LetterDetail>(`/letters/public/${id}`);
  },

  getLetter: (id: string) => {
    return httpClient.get<LetterDetail>(`/letters/${id}`);
  },

  deleteLetter: (id: string) => {
    return httpClient.delete<void>(`/letters/${id}`);
  },

  getUserLetters: (page = 1, pageSize = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    return httpClient.get<LetterListResult>(`/users/letters?${params.toString()}`);
  },

  getUserStats: () => {
    return httpClient.get<UserStats>('/users/stats');
  },
};
