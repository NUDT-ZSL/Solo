import axios from 'axios';
import type { ApiResponse, Game, Comment } from '../types';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const gameApi = {
  getGames: async (sortBy: 'heat' | 'rating' = 'heat'): Promise<Game[]> => {
    const response = await apiClient.get<ApiResponse<Game[]>>('/games', {
      params: { sortBy }
    });
    return response.data.data || [];
  },

  getGameById: async (id: string): Promise<Game | null> => {
    const response = await apiClient.get<ApiResponse<Game>>(`/games/${id}`);
    return response.data.data || null;
  },

  rateGame: async (gameId: string, userId: string, score: number): Promise<{ averageRating: number; ratingsCount: number } | null> => {
    const response = await apiClient.post<ApiResponse<{ averageRating: number; ratingsCount: number }>>(
      `/games/${gameId}/rating`,
      { userId, score }
    );
    return response.data.data || null;
  },

  toggleLike: async (gameId: string, userId: string): Promise<{ likeCount: number; liked: boolean } | null> => {
    const response = await apiClient.post<ApiResponse<{ likeCount: number; liked: boolean }>>(
      `/games/${gameId}/like`,
      { userId }
    );
    return response.data.data || null;
  },

  getComments: async (gameId: string): Promise<Comment[]> => {
    const response = await apiClient.get<ApiResponse<Comment[]>>(`/games/${gameId}/comments`);
    return response.data.data || [];
  },

  addComment: async (
    gameId: string,
    userId: string,
    userName: string,
    rating: number,
    content: string
  ): Promise<Comment | null> => {
    const response = await apiClient.post<ApiResponse<Comment>>(
      `/games/${gameId}/comments`,
      { userId, userName, rating, content }
    );
    return response.data.data || null;
  },

  downloadPdf: async (gameId: string, gameName: string): Promise<void> => {
    const response = await apiClient.get(`/games/${gameId}/pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${gameName}-规则书.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const getUserId = (): string => {
  let userId = localStorage.getItem('gameUserId');
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('gameUserId', userId);
  }
  return userId;
};

export const getUserName = (): string => {
  let userName = localStorage.getItem('gameUserName');
  if (!userName) {
    userName = `玩家${Math.floor(Math.random() * 10000)}`;
    localStorage.setItem('gameUserName', userName);
  }
  return userName;
};
