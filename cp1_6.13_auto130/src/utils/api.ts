import axios from 'axios';
import type { Card, GameRecord, AIConfig } from '../../shared/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const cardApi = {
  getCards: async (): Promise<Card[]> => {
    const response = await api.get('/cards');
    return response.data.cards;
  },
};

export const statsApi = {
  getStats: async (): Promise<GameRecord[]> => {
    const response = await api.get('/stats');
    return response.data.records;
  },
  
  saveStats: async (record: Omit<GameRecord, '_id'>): Promise<GameRecord> => {
    const response = await api.post('/stats', record);
    return response.data.record;
  },
};

export const aiConfigApi = {
  getConfig: async (): Promise<AIConfig> => {
    const response = await api.get('/ai-config');
    return response.data.config;
  },
};
