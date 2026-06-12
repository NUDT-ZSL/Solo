import axios from 'axios';
import type { Material, Board, BoardMaterial } from '@shared/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => config,
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Response error:', error);
    return Promise.reject(error);
  }
);

export const apiClient = {
  getMaterials: async (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    tag?: string;
  }): Promise<{ materials: Material[]; total: number; hasMore: boolean }> => {
    try {
      const response = await api.get('/materials', { params });
      return response.data;
    } catch (error) {
      console.error('getMaterials error:', error);
      throw error;
    }
  },

  createMaterial: async (
    formData: FormData,
    onUploadProgress?: (progressEvent: { loaded: number; total: number }) => void
  ): Promise<Material> => {
    try {
      const response = await api.post('/materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      });
      return response.data;
    } catch (error) {
      console.error('createMaterial error:', error);
      throw error;
    }
  },

  getMaterial: async (id: string): Promise<Material> => {
    try {
      const response = await api.get(`/materials/${id}`);
      return response.data;
    } catch (error) {
      console.error('getMaterial error:', error);
      throw error;
    }
  },

  updateMaterial: async (id: string, data: Partial<Material>): Promise<Material> => {
    try {
      const response = await api.put(`/materials/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('updateMaterial error:', error);
      throw error;
    }
  },

  deleteMaterial: async (id: string): Promise<void> => {
    try {
      await api.delete(`/materials/${id}`);
    } catch (error) {
      console.error('deleteMaterial error:', error);
      throw error;
    }
  },

  getBoards: async (): Promise<Board[]> => {
    try {
      const response = await api.get('/boards');
      return response.data;
    } catch (error) {
      console.error('getBoards error:', error);
      throw error;
    }
  },

  createBoard: async (data: { name: string; description?: string }): Promise<Board> => {
    try {
      const response = await api.post('/boards', data);
      return response.data;
    } catch (error) {
      console.error('createBoard error:', error);
      throw error;
    }
  },

  getBoard: async (id: string): Promise<Board> => {
    try {
      const response = await api.get(`/boards/${id}`);
      return response.data;
    } catch (error) {
      console.error('getBoard error:', error);
      throw error;
    }
  },

  updateBoard: async (id: string, data: Partial<Board>): Promise<Board> => {
    try {
      const response = await api.put(`/boards/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('updateBoard error:', error);
      throw error;
    }
  },

  deleteBoard: async (id: string): Promise<void> => {
    try {
      await api.delete(`/boards/${id}`);
    } catch (error) {
      console.error('deleteBoard error:', error);
      throw error;
    }
  },

  moveMaterials: async (boardId: string, materialIds: string[]): Promise<void> => {
    try {
      await api.post(`/boards/${boardId}/materials`, { materialIds });
    } catch (error) {
      console.error('moveMaterials error:', error);
      throw error;
    }
  },

  getBoardMaterials: async (boardId: string): Promise<BoardMaterial[]> => {
    try {
      const response = await api.get(`/boards/${boardId}/materials`);
      return response.data;
    } catch (error) {
      console.error('getBoardMaterials error:', error);
      throw error;
    }
  },

  getAllTags: async (): Promise<string[]> => {
    try {
      const response = await api.get('/tags');
      return response.data;
    } catch (error) {
      console.error('getAllTags error:', error);
      throw error;
    }
  },
};
